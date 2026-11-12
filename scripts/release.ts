/**
 * Releases a version of the kit itself: `npm run release -- --minor -m "what it brings"`.
 *
 * Apps release with deploy(). The kit has no Hosting, and its release commit carries the work
 * itself (src/, dist/, docs), so uncommitted changes are expected here and go into that commit.
 * The apps read the CHANGELOG to know what to change, so a release without entries under
 * "## Unreleased" is refused instead of falling back to commit subjects.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import {
  VERSION_TYPES, addChangelogVersion, git, gitReleaseProblem, githubRepoUrl, incrementVersion, isSemver, lastReleaseTag,
  pushRelease, releaseTag, tagExists, unreleasedNotes, writeVersion,
} from '../src/deploy.ts'
import type { VersionType } from '../src/deploy.ts'
import { todayIso } from '../src/utils/dates.ts'

const BRANCH = 'main'
const CHANGELOG = 'CHANGELOG.md'
const USAGE = 'Usage: npm run release -- --patch|--minor|--major -m "summary" [-m "another paragraph"] [--yes] [--check]'
/** Changes here can break the apps' rules: then the emulator tests run too. */
const RULES_FILES = /^(rules\/|src\/rules|tests\/emulator\/)/

export interface ReleaseArgs {
  checkOnly: boolean
  /** Null: asked in the terminal. */
  versionType: VersionType | null
  /** The -m values: the first is the summary after "vX.Y.Z: ", the rest end the commit message. */
  messages: string[]
  /** Releases without asking for confirmation. */
  yes: boolean
}

/** Parses the arguments; returns null if they are not valid. */
export function parseReleaseArgs(args: readonly string[]): ReleaseArgs | null {
  const parsed: ReleaseArgs = { checkOnly: false, versionType: null, messages: [], yes: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const type = VERSION_TYPES.find((entry) => arg === `--${entry}`)
    if (type) {
      if (parsed.versionType) return null
      parsed.versionType = type
    } else if (arg === '-m' || arg === '--message') {
      const value = args[index + 1]?.trim()
      if (!value) return null
      parsed.messages.push(value)
      index += 1
    } else if (arg === '--check') {
      parsed.checkOnly = true
    } else if (arg === '--yes' || arg === '-y') {
      parsed.yes = true
    } else {
      return null
    }
  }
  return parsed
}

/**
 * The release commit message: "vX.Y.Z: summary", the CHANGELOG entries ("### Changed" as
 * "Changed:", git would read a leading # as a comment if the message is ever edited), then the
 * extra paragraphs (e.g. a Co-Authored-By trailer).
 */
export function releaseCommitMessage(tag: string, messages: readonly string[], entries: readonly string[]): string {
  const [summary, ...extra] = messages
  const body = entries.map((line) => line.replace(/^#{3,}\s+(.*)$/, '$1:'))
  return [`${tag}: ${summary}`, '', ...body, ...extra.flatMap((paragraph) => ['', paragraph])].join('\n')
}

/** Files that differ from `tag`, committed or not, new ones included. Without a tag, null (unknown). */
function changedSince(root: string, tag: string | null): string[] | null {
  if (!tag) return null
  const tracked = git(root, ['diff', '--name-only', tag]).split('\n')
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard']).split('\n')
  return [...tracked, ...untracked].filter(Boolean)
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

function terminalQuestion(): ((question: string) => Promise<string>) | null {
  if (!process.stdin.isTTY) return null
  return async (question) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    try {
      return await rl.question(question)
    } finally {
      rl.close()
    }
  }
}

export interface ReleaseOptions {
  /** The kit's root (package.json, CHANGELOG.md). */
  root: string
  args: readonly string[]
  /** Asks in the terminal; null without one (then the flags must say everything). Defaults to stdin if it is a TTY. */
  ask?: ((question: string) => Promise<string>) | null
  log?: (line: string) => void
  /** Output of the npm scripts; tests silence it. */
  stdio?: 'inherit' | 'ignore'
}

/**
 * Stops at the first step that fails and returns the exit code:
 * 1. git: on main, up to date with GitHub (fetched), the new tag free; entries under "Unreleased".
 * 2. Shows the version, the commit message and the uncommitted files that go in, and asks.
 * 3. Writes the version (package.json, package-lock.json), moves "Unreleased" to it in the
 *    CHANGELOG, runs `npm run check` (rebuilds dist/) and, if rules files changed since the last
 *    tag, `npm run test:rules`. If one fails, the version and CHANGELOG go back.
 * 4. Commits everything as "vX.Y.Z: summary", creates the annotated tag and pushes both together.
 *    If only the push fails, the commit and tag stay and it prints the push command.
 * --check runs steps 1 and 2, the checks of step 3 on the current files, and touches nothing in git.
 */
export async function release(options: ReleaseOptions): Promise<number> {
  const { root } = options
  const log = options.log ?? console.log
  const ask = options.ask === undefined ? terminalQuestion() : options.ask
  const stdio = options.stdio ?? 'inherit'
  const parsed = parseReleaseArgs(options.args)
  if (!parsed) {
    log(USAGE)
    return 2
  }

  const undoSteps: (() => void)[] = []
  function fail(message: string, code = 1): number {
    if (undoSteps.length > 0) {
      for (const step of [...undoSteps].reverse()) {
        try {
          step()
        } catch (error) {
          log(`⚠️  Could not undo a step: ${errorText(error)}`)
        }
      }
      log('↩️  Undone: version, CHANGELOG.md, commit and tag. Your changes are still there, uncommitted.')
    }
    log(`❌ ${message}`)
    return code
  }
  function run(command: string, args: string[]): boolean {
    log(`\n$ ${command} ${args.join(' ')}`)
    const result = spawnSync(command, args, { cwd: root, stdio })
    return !result.error && result.status === 0
  }

  log(`\n🌿 Checking git (branch ${BRANCH}, up to date with the remote)...`)
  const gitProblem = gitReleaseProblem(root, BRANCH, { allowUncommitted: true })
  if (gitProblem) return fail(gitProblem)
  // gitReleaseProblem has checked that the branch has a remote.
  const remote = git(root, ['config', '--get', `branch.${BRANCH}.remote`])
  let repoUrl: string | null = null
  try {
    repoUrl = githubRepoUrl(git(root, ['remote', 'get-url', remote]))
  } catch {
    // Without a GitHub address the version just has no compare link.
  }

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version?: unknown; scripts?: Record<string, string> }
  const current = pkg.version
  if (!isSemver(current)) return fail(`The package.json version ("${String(current)}") is not in MAJOR.MINOR.PATCH format.`)
  const changelogPath = join(root, CHANGELOG)
  const changelog = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : null
  const entries = unreleasedNotes(changelog)
  if (!entries) return fail(`Nothing under "## Unreleased" in ${CHANGELOG}: write there what changes for the apps (and an "### Upgrade" section if they must change something), then run this again.`)

  let versionType = parsed.versionType
  if (!versionType) {
    if (!ask) return fail('No interactive terminal: pass --patch, --minor or --major.', 2)
    log('\n🔄 What kind of release is this?')
    log(`  1. PATCH (${incrementVersion(current, 'patch')}) - fixes`)
    log(`  2. MINOR (${incrementVersion(current, 'minor')}) - new features or changed behaviour`)
    log(`  3. MAJOR (${incrementVersion(current, 'major')}) - the apps must change`)
    const choices: Record<string, VersionType> = { 1: 'patch', 2: 'minor', 3: 'major' }
    versionType = choices[(await ask('Choose (1-3): ')).trim()] ?? null
    if (!versionType) return fail('Choose 1, 2 or 3.', 2)
  }
  const version = incrementVersion(current, versionType)
  const tag = releaseTag(version)
  if (tagExists(root, tag)) return fail(`The tag ${tag} already exists: the package.json version (${current}) is behind the latest release.`)

  const messages = [...parsed.messages]
  if (messages.length === 0) {
    if (!ask) return fail('No interactive terminal: pass the summary with -m "...".', 2)
    const summary = (await ask(`\n💬 Summary, after "${tag}: " (one line): `)).trim()
    if (!summary) return fail('The commit needs a summary.', 2)
    messages.push(summary)
  }
  const message = releaseCommitMessage(tag, messages, entries)
  const previousTag = lastReleaseTag(root)
  const changed = changedSince(root, previousTag)
  const rulesChanged = Boolean(pkg.scripts?.['test:rules']) && (changed === null || changed.some((file) => RULES_FILES.test(file)))
  const uncommitted = git(root, ['ls-files', '--modified', '--deleted', '--others', '--exclude-standard'])
    .split('\n').filter(Boolean)
  const staged = git(root, ['diff', '--cached', '--name-only']).split('\n').filter(Boolean)
  const pending = [...new Set([...staged, ...uncommitted])].sort()

  log(`\n📦 ${current} -> ${version} (${versionType.toUpperCase()}), tag ${tag}`)
  log(`📝 ${CHANGELOG}: the entries under "Unreleased" become ${tag} (${todayIso()}).`)
  log(`💬 Commit:\n${message.split('\n').map((line) => `   ${line}`).join('\n')}`)
  log(pending.length > 0
    ? `📁 Uncommitted files that go into it, plus the version, ${CHANGELOG} and dist/:\n${pending.map((file) => `   ${file}`).join('\n')}`
    : `📁 No uncommitted files: the commit has the version, ${CHANGELOG} and dist/.`)
  if (rulesChanged) log('📜 Rules files changed since the last tag: the emulator tests run too (npm run test:rules, needs Java).')

  if (parsed.checkOnly) {
    if (!run('npm', ['run', 'check'])) return fail('npm run check failed.')
    if (rulesChanged && !run('npm', ['run', 'test:rules'])) return fail('npm run test:rules failed.')
    log('\n✅ Checks passed (dist/ rebuilt). Nothing was committed, tagged or pushed.')
    return 0
  }
  if (!parsed.yes) {
    if (!ask) return fail('No interactive terminal: pass --yes to release without confirming.', 2)
    const answer = (await ask(`\nRelease ${tag} and push it to GitHub? (y/N) `)).trim()
    if (!/^(y|yes|s|si|sí)$/i.test(answer)) {
      log('Cancelled: nothing changed.')
      return 1
    }
  }

  try {
    undoSteps.push(writeVersion(root, version))
    writeFileSync(changelogPath, addChangelogVersion(changelog, { version, date: todayIso(), notes: [], previousTag, repoUrl }))
    undoSteps.push(() => (changelog === null ? rmSync(changelogPath) : writeFileSync(changelogPath, changelog)))
  } catch (error) {
    return fail(`Could not write the version or ${CHANGELOG}: ${errorText(error)}`)
  }

  log('\n🔍 Lint, types, tests and build to dist/...')
  if (!run('npm', ['run', 'check'])) return fail('npm run check failed: fix it and run the release again.')
  if (rulesChanged) {
    log('\n📜 Rules in the Firestore emulator...')
    if (!run('npm', ['run', 'test:rules'])) return fail('npm run test:rules failed: fix it and run the release again.')
  }

  log(`\n🏷️  Commit and tag ${tag}...`)
  try {
    git(root, ['add', '--all'])
    undoSteps.push(() => git(root, ['reset', '-q']))
    git(root, ['commit', '-q', '--cleanup=whitespace', '-m', message])
    undoSteps.push(() => git(root, ['reset', '-q', '--soft', 'HEAD~1']))
    git(root, ['tag', '-a', tag, '-m', `${tag}: ${messages[0]}`])
  } catch (error) {
    return fail(`Could not commit or tag: ${errorText(error)}`)
  }
  undoSteps.length = 0

  log(`\n⬆️  Pushing the commit and ${tag}...`)
  try {
    pushRelease(root, BRANCH, version)
  } catch (error) {
    log(`⚠️  ${tag} is committed and tagged here, but the push failed: ${errorText(error)}`)
    log(`   Push it when you can: git push --atomic ${remote} ${BRANCH} ${tag}`)
    return 1
  }
  log(`✅ ${tag} pushed.`)
  if (repoUrl) log(`\nNext, in each app: npm install ${repoUrl.replace('https://github.com/', 'github:')}#${tag}`)
  return 0
}

if (import.meta.main) {
  process.exitCode = await release({ root: fileURLToPath(new URL('..', import.meta.url)), args: process.argv.slice(2) })
}
