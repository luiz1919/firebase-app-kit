import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { firebaseConfigFromEnv, isFirebaseConfigured } from './config.ts'
import type { FirebaseWebConfig } from './config.ts'
import { todayIso } from './utils/dates.ts'

export const VERSION_TYPES = ['patch', 'minor', 'major'] as const
export type VersionType = (typeof VERSION_TYPES)[number]

export interface DeployOptions {
  /** Name shown in the banner. */
  appName: string
  /** Firebase project to publish to. The compiled config must belong to this project. */
  projectId: string
  /** App root (package.json, firebase.json, vite.config.ts). Defaults to the current directory. */
  root?: string | URL
  /** Arguments of `npm run deploy -- ...`. Defaults to process.argv.slice(2). */
  args?: readonly string[]
  /** Branch releases are made from. Defaults to 'main'. */
  releaseBranch?: string
  /**
   * Changelog file, relative to `root` (e.g. 'Changelog.md'). If given, each release adds its
   * version to it in a "docs(changelog): vX.Y.Z" commit, before the release commit. See `addChangelogVersion`.
   */
  changelog?: string
}

export interface DeployArgs {
  checkOnly: boolean
  /** Change type given; null if it must be asked (or with --check). */
  versionType: VersionType | null
}

const USAGE = 'Usage: npm run deploy [-- --check|--patch|--minor|--major]'

/** Parses the arguments; returns null if they are not valid. */
export function parseDeployArgs(args: readonly string[]): DeployArgs | null {
  if (args.length === 0) return { checkOnly: false, versionType: null }
  if (args.length > 1) return null
  if (args[0] === '--check') return { checkOnly: true, versionType: null }
  const versionType = VERSION_TYPES.find((type) => args[0] === `--${type}`)
  return versionType ? { checkOnly: false, versionType } : null
}

export const isSemver = (version: unknown): version is string =>
  typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version)

export function incrementVersion(current: string, type: VersionType): string {
  const [major, minor, patch] = current.split('.').map(Number)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

/** Writes the version to package.json and package-lock.json (if present) and returns how to undo it. */
export function writeVersion(root: string, version: string): () => void {
  const originals = ['package.json', 'package-lock.json']
    .map((name) => join(root, name))
    .filter((file) => existsSync(file))
    .map((file) => ({ file, content: readFileSync(file, 'utf8') }))
  // All are parsed before writing any: if one is broken, nothing is touched.
  const updated = originals.map(({ file, content }) => {
    const data = JSON.parse(content)
    data.version = version
    if (data.packages?.['']) data.packages[''].version = version
    return { file, content: `${JSON.stringify(data, null, 2)}\n` }
  })
  for (const { file, content } of updated) writeFileSync(file, content)
  return () => {
    for (const { file, content } of originals) writeFileSync(file, content)
  }
}

/** Runs git in `root` and returns its trimmed output; throws with git's own message if it fails. */
export function git(root: string, args: readonly string[]): string {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (result.error) throw new Error('Cannot run git. Check that git is installed.')
  if (result.status !== 0) throw new Error((result.stderr || result.stdout).trim() || `git ${args.join(' ')} failed`)
  return result.stdout.trim()
}

/** Git tag of a version: 1.2.3 -> v1.2.3. */
export const releaseTag = (version: string): string => `v${version}`

export function tagExists(root: string, tag: string): boolean {
  try {
    git(root, ['rev-parse', '-q', '--verify', `refs/tags/${tag}`])
    return true
  } catch {
    return false
  }
}

/** Remote of the release branch (usually "origin"). */
const remoteOf = (root: string, branch: string) => git(root, ['config', '--get', `branch.${branch}.remote`])

/**
 * Checks that a release can be made: on `branch`, nothing uncommitted, and up to date with its
 * remote branch. It fetches the remote (branches and tags), which also checks access to GitHub.
 * Returns the problem, or null if everything is ready.
 */
export function gitReleaseProblem(root: string, branch: string): string | null {
  try {
    git(root, ['rev-parse', '--is-inside-work-tree'])
  } catch {
    return 'This folder is not a git repository.'
  }
  const current = git(root, ['branch', '--show-current'])
  if (current !== branch) return `Releases are made from the "${branch}" branch, and you are on "${current || 'a detached HEAD'}".`
  if (git(root, ['status', '--porcelain'])) return 'There are uncommitted changes: commit (or discard) them before deploying.'
  let remote: string
  let upstream: string
  try {
    remote = remoteOf(root, branch)
    upstream = git(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
  } catch {
    return `The "${branch}" branch is not linked to a remote branch: run git push -u origin ${branch} once.`
  }
  try {
    git(root, ['fetch', '--quiet', '--tags', remote])
  } catch (error) {
    return `Cannot reach the git remote "${remote}": ${error instanceof Error ? error.message : String(error)}`
  }
  const behind = Number(git(root, ['rev-list', '--count', `HEAD..${upstream}`]))
  if (behind > 0) return `"${branch}" is ${behind} commit(s) behind ${upstream}: run git pull first.`
  return null
}

/** New changelog content to commit with a release; `file` is relative to the app root. */
export interface ChangelogChange {
  file: string
  content: string
}

/**
 * Locally, and in this order: commits the changelog (if given) as "docs(changelog): vX.Y.Z", writes
 * the version and commits package.json and package-lock.json as "chore(release): vX.Y.Z", and
 * creates the annotated tag. Returns how to undo all of it (if the build or the deploy fails).
 */
export function createRelease(root: string, version: string, changelog?: ChangelogChange): () => void {
  const tag = releaseTag(version)
  const files = ['package.json', 'package-lock.json'].filter((name) => existsSync(join(root, name)))
  const undoSteps: (() => void)[] = []
  const undo = () => {
    for (const step of [...undoSteps].reverse()) {
      try {
        step()
      } catch (error) {
        console.error(`⚠️  Could not undo a release step: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  try {
    if (changelog) {
      const path = join(root, changelog.file)
      const original = existsSync(path) ? readFileSync(path, 'utf8') : null
      writeFileSync(path, changelog.content)
      undoSteps.push(() => (original === null ? rmSync(path) : writeFileSync(path, original)))
      git(root, ['add', '--', changelog.file])
      undoSteps.push(() => git(root, ['reset', '-q', '--', changelog.file]))
      git(root, ['commit', '-q', '-m', `docs(changelog): ${tag}`])
      undoSteps.push(() => git(root, ['reset', '-q', '--soft', 'HEAD~1']))
    }
    undoSteps.push(writeVersion(root, version))
    git(root, ['add', '--', ...files])
    undoSteps.push(() => git(root, ['reset', '-q', '--', ...files]))
    git(root, ['commit', '-q', '-m', `chore(release): ${tag}`])
    undoSteps.push(() => git(root, ['reset', '-q', '--soft', 'HEAD~1']))
    git(root, ['tag', '-a', tag, '-m', tag])
    undoSteps.push(() => git(root, ['tag', '-d', tag]))
  } catch (error) {
    undo()
    throw error
  }
  return undo
}

/** Pushes the release commits and the tag together (all or nothing). */
export function pushRelease(root: string, branch: string, version: string): void {
  git(root, ['push', '--quiet', '--atomic', remoteOf(root, branch), `HEAD:refs/heads/${branch}`, `refs/tags/${releaseTag(version)}`])
}

/** Latest vX.Y.Z tag reachable from HEAD, or null if there is none yet. */
export function lastReleaseTag(root: string): string | null {
  try {
    return git(root, ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*.[0-9]*.[0-9]*'])
  } catch {
    return null
  }
}

/** Subjects of the commits after `tag` (all of them if null), oldest first, without merges. */
export function commitSubjectsSince(root: string, tag: string | null): string[] {
  const output = git(root, ['log', '--no-merges', '--reverse', '--format=%s', tag ? `${tag}..HEAD` : 'HEAD'])
  return output.split('\n').filter((line) => line.trim())
}

const RELEASE_SUBJECT = /^(chore\(release\)|docs\(changelog\)): v\d+\.\d+\.\d+$/
const CONVENTIONAL_PREFIX = /^(feat|fix|docs|chore|refactor|perf|style|test|build|ci|revert)(\([^)]*\))?!?:\s*/i

/**
 * Changelog notes from commit subjects: without the release commits, without conventional
 * prefixes ("feat(ui): add x" -> "Add x"), capitalized and without repeats.
 */
export function releaseNotes(subjects: readonly string[]): string[] {
  const notes: string[] = []
  for (const subject of subjects) {
    const trimmed = subject.trim()
    if (RELEASE_SUBJECT.test(trimmed)) continue
    const text = trimmed.replace(CONVENTIONAL_PREFIX, '')
    if (!text) continue
    const note = text[0].toUpperCase() + text.slice(1)
    if (!notes.includes(note)) notes.push(note)
  }
  return notes
}

/** Web address of a GitHub repo from its git remote (https or ssh), or null if it is not GitHub. */
export function githubRepoUrl(remoteUrl: string): string | null {
  const match = remoteUrl.trim().match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/)
  return match ? `https://github.com/${match[1]}/${match[2]}` : null
}

const UNRELEASED_HEADING = /^## Unreleased\s*$/i
const UNRELEASED_PLACEHOLDER = '_Nothing yet._'
const LINK_REFERENCE = /^\[[^\]]+\]: /

/** Lines of the "## Unreleased" section, from the line after the heading to the next section or the links. */
function unreleasedRange(lines: readonly string[]): { start: number; end: number } | null {
  const heading = lines.findIndex((line) => UNRELEASED_HEADING.test(line))
  if (heading === -1) return null
  let end = heading + 1
  while (end < lines.length && !lines[end].startsWith('## ') && !LINK_REFERENCE.test(lines[end])) end += 1
  return { start: heading + 1, end }
}

/** Entries written by hand under "## Unreleased" (without blank edges or the placeholder), or null if there are none. */
export function unreleasedNotes(content: string | null): string[] | null {
  const lines = (content ?? '').split('\n')
  const range = unreleasedRange(lines)
  if (!range) return null
  const section = lines.slice(range.start, range.end).filter((line) => line.trim() !== UNRELEASED_PLACEHOLDER)
  while (section.length > 0 && !section[0].trim()) section.shift()
  while (section.length > 0 && !section[section.length - 1].trim()) section.pop()
  return section.length > 0 ? section : null
}

export interface ChangelogRelease {
  version: string
  /** Release date, YYYY-MM-DD. */
  date: string
  /** Notes from the commits (`releaseNotes`): used if nothing was written under "Unreleased". */
  notes: readonly string[]
  /** Previous release tag, for the compare link. */
  previousTag: string | null
  /** GitHub repo address (`githubRepoUrl`); without it the version has no link. */
  repoUrl: string | null
}

/**
 * Changelog content with the new version added, newest first ("Keep a Changelog" style):
 * - The version lists the entries written under "## Unreleased" if there are any, otherwise the
 *   commit notes. "Unreleased" is left empty ("_Nothing yet._") for the next version.
 * - Without an "Unreleased" section, the version goes before the first "## " section.
 * - With a GitHub repo, the heading is a link to the changes since the previous tag.
 * A missing file (null) becomes a new changelog.
 */
export function addChangelogVersion(content: string | null, release: ChangelogRelease): string {
  const tag = releaseTag(release.version)
  const source = content ?? `# Changelog\n\n## Unreleased\n\n${UNRELEASED_PLACEHOLDER}\n`
  const lines = source.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n')
  const handWritten = unreleasedNotes(source)
  const entries = handWritten ?? (release.notes.length > 0 ? release.notes.map((note) => `- ${note}`) : ['- No changes since the previous version.'])
  const section = [`## ${release.repoUrl ? `[${tag}]` : tag} - ${release.date}`, '', ...entries, '']

  const range = unreleasedRange(lines)
  if (range) {
    lines.splice(range.start, range.end - range.start, '', UNRELEASED_PLACEHOLDER, '', ...section)
  } else {
    let at = lines.findIndex((line) => line.startsWith('## ') || LINK_REFERENCE.test(line))
    if (at === -1) at = lines.length
    lines.splice(at, 0, ...(at > 0 && lines[at - 1].trim() ? ['', ...section] : section))
  }

  if (release.repoUrl) {
    const target = release.previousTag ? `compare/${release.previousTag}...${tag}` : `releases/tag/${tag}`
    const link = `[${tag}]: ${release.repoUrl}/${target}`
    const at = lines.findIndex((line) => LINK_REFERENCE.test(line))
    if (at !== -1) lines.splice(at, 0, link)
    else lines.push(...(lines[lines.length - 1].trim() ? ['', link] : [link]))
  }
  return `${lines.join('\n').replace(/\n+$/, '')}\n`
}

/**
 * Reads the Firebase config the build will use: VITE_FIREBASE_* variables and, if the app
 * uses it, the file read by the firebaseAppKit() plugin.
 */
export async function buildFirebaseConfig(root: string): Promise<FirebaseWebConfig> {
  // resolveConfig() fills in process.env (for example NODE_ENV=development). It is restored:
  // otherwise `npm run build` would inherit it and build React in development mode.
  const env = { ...process.env }
  try {
    const { resolveConfig } = await import('vite')
    const resolved = await resolveConfig({ root, logLevel: 'silent' }, 'build', 'production', 'production')
    const fileConfig = JSON.parse(String(resolved.define?.__FIREBASE_CONFIG__ ?? '{}')) as FirebaseWebConfig
    return firebaseConfigFromEnv(resolved.env, fileConfig)
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key]
    Object.assign(process.env, env)
  }
}

/** Reason not to publish with this config, or null if it is correct. */
export function firebaseConfigProblem(config: FirebaseWebConfig, projectId: string): string | null {
  if (!isFirebaseConfigured(config)) return 'The production Firebase config is incomplete.'
  if (config.projectId !== projectId) {
    return `The production Firebase config belongs to project "${config.projectId}", not ${projectId}.`
  }
  return null
}

function askVersionType(current: string): Promise<VersionType> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    console.log('\n🔄 What kind of change is this deploy?\n')
    console.log(`  1. PATCH (${incrementVersion(current, 'patch')}) - Bug fixes, minor UI changes, optimizations`)
    console.log(`  2. MINOR (${incrementVersion(current, 'minor')}) - New features, new screens`)
    console.log(`  3. MAJOR (${incrementVersion(current, 'major')}) - Breaking changes, data migration\n`)
    rl.question('Choose (1-3): ', (answer) => {
      rl.close()
      const choices: Record<string, VersionType> = { 1: 'patch', 2: 'minor', 3: 'major' }
      resolve(choices[answer.trim()] ?? 'patch')
    })
  })
}

function banner(appName: string) {
  const width = 44
  const title = `🚀 ${appName} Deploy`
  const left = Math.max(1, Math.floor((width - title.length) / 2))
  const right = Math.max(1, width - title.length - left)
  console.log(`╔${'═'.repeat(width)}╗`)
  console.log(`║${' '.repeat(left)}${title}${' '.repeat(right)}║`)
  console.log(`╚${'═'.repeat(width)}╝`)
}

/**
 * Releases and publishes the app to Firebase Hosting. Stops at the first step that fails:
 * 1. Checks the Firebase CLI and git (release branch, nothing uncommitted, up to date with the remote),
 *    asks for the change type (unless --check or a type is given) and checks the new tag is free.
 * 2. npm ci, checks that the compiled Firebase config belongs to the project, lint and tests (if there is a test script).
 * 3. Locally, before building (so "Acerca de" (About) shows the published version and commit): with the
 *    `changelog` option, adds the version to the changelog and commits it; then creates the release commit
 *    (version in package.json and package-lock.json) and the vX.Y.Z tag.
 * 4. Builds and publishes Hosting only. If the build or the publish fails, the commits, tag, version and
 *    changelog are undone.
 * 5. Pushes the commits and the tag. A tag on GitHub therefore always means "this version is published".
 * --check runs steps 2 and the build only (and shows what the changelog would get), without touching git or Firebase.
 */
export async function deploy(options: DeployOptions): Promise<void> {
  const root = options.root instanceof URL ? fileURLToPath(options.root) : (options.root ?? process.cwd())
  const parsed = parseDeployArgs(options.args ?? process.argv.slice(2))
  if (!parsed) {
    console.error(USAGE)
    process.exit(2)
  }
  const { checkOnly, versionType: forcedType } = parsed
  const { projectId } = options
  const branch = options.releaseBranch ?? 'main'
  process.chdir(root)

  // If something fails after creating the release, it is undone: nothing was published or pushed.
  let undoRelease: (() => void) | null = null

  function fail(message: string, code = 1): never {
    if (undoRelease) {
      undoRelease()
      console.error('↩️  Release undone (commits, tag, version and changelog): nothing was published or pushed.')
    }
    console.error(`❌ ${message}`)
    process.exit(code)
  }

  function run(command: string, commandArgs: string[]) {
    console.log(`\n$ ${command} ${commandArgs.join(' ')}`)
    const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit' })
    if (result.error) {
      fail(`Cannot run ${command}. ${command === 'firebase' ? 'Install the Firebase CLI: npm install -g firebase-tools' : 'Check that Node and npm are installed.'}`)
    }
    if (result.status !== 0) fail(`Command failed: ${command} ${commandArgs.join(' ')}`, result.status ?? 1)
  }

  const readPackage = () => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    version?: unknown
    scripts?: Record<string, string>
  }

  banner(options.appName)

  let newVersion = ''
  if (!checkOnly) {
    console.log('\n🔐 Checking Firebase CLI...')
    run('firebase', ['--version'])

    console.log(`\n🌿 Checking git (branch ${branch}, uncommitted changes, remote)...`)
    const gitProblem = gitReleaseProblem(root, branch)
    if (gitProblem) fail(gitProblem)

    const currentVersion = readPackage().version
    if (!isSemver(currentVersion)) fail(`The package.json version ("${currentVersion}") is not in MAJOR.MINOR.PATCH format.`)
    // Asked at the start so there is no need to wait for the build.
    if (!forcedType && !process.stdin.isTTY) {
      fail('No interactive terminal: pass the change type with -- --patch, -- --minor or -- --major.', 2)
    }
    const versionType = forcedType ?? (await askVersionType(currentVersion))
    newVersion = incrementVersion(currentVersion, versionType)
    if (tagExists(root, releaseTag(newVersion))) {
      fail(`The tag ${releaseTag(newVersion)} already exists: the package.json version (${currentVersion}) is behind the latest release.`)
    }
    console.log(`\n📦 Current version: ${currentVersion}`)
    console.log(`📦 New version:     ${newVersion} (${versionType.toUpperCase()})`)
  }

  // Shown before the long steps so the entries can be checked (and the deploy stopped) in time.
  let changelog: ChangelogChange | undefined
  if (options.changelog) {
    const path = join(root, options.changelog)
    const content = existsSync(path) ? readFileSync(path, 'utf8') : null
    const previousTag = lastReleaseTag(root)
    let notes: string[]
    try {
      notes = releaseNotes(commitSubjectsSince(root, previousTag))
    } catch (error) {
      fail(`Could not read the commits for ${options.changelog}: ${error instanceof Error ? error.message : String(error)}`)
    }
    const handWritten = unreleasedNotes(content)
    const source = handWritten ? 'the entries under "Unreleased"' : `the commits since ${previousTag ?? 'the first one'}`
    console.log(`\n📝 ${options.changelog} ${checkOnly ? 'would list' : 'will list'} ${source}:`)
    for (const line of handWritten ?? (notes.length > 0 ? notes.map((note) => `- ${note}`) : ['- No changes since the previous version.'])) {
      console.log(`   ${line}`)
    }
    if (!checkOnly) {
      let repoUrl: string | null = null
      try {
        repoUrl = githubRepoUrl(git(root, ['remote', 'get-url', remoteOf(root, branch)]))
      } catch {
        // No remote address: the version simply has no link.
      }
      const date = todayIso()
      changelog = { file: options.changelog, content: addChangelogVersion(content, { version: newVersion, date, notes, previousTag, repoUrl }) }
    }
  }

  console.log('\n📥 Installing dependencies...')
  run('npm', ['ci'])

  let firebaseConfig: FirebaseWebConfig
  try {
    firebaseConfig = await buildFirebaseConfig(root)
  } catch (error) {
    fail(`Could not read the Vite config: ${error instanceof Error ? error.message : String(error)}`)
  }
  const problem = firebaseConfigProblem(firebaseConfig, projectId)
  if (problem) fail(`${problem} Nothing will be published.`)

  const hasTests = Boolean(readPackage().scripts?.test)
  console.log(hasTests ? '\n🔍 Running lint and tests...' : '\n🔍 Running lint...')
  run('npm', ['run', 'lint'])
  if (hasTests) run('npm', ['test'])

  // The release commit is made before building so "Acerca de" (About) shows the published version and commit.
  if (!checkOnly) {
    console.log(`\n🏷️  Creating ${changelog ? `the ${changelog.file} commit, ` : ''}the release commit and tag ${releaseTag(newVersion)}...`)
    try {
      undoRelease = createRelease(root, newVersion, changelog)
    } catch (error) {
      fail(`Could not create the release commit: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log('\n🔨 Building...')
  run('npm', ['run', 'build'])

  if (checkOnly) {
    console.log('\n✅ Validation passed. Nothing was published.\n')
    return
  }

  console.log('\n🚀 Deploying to Firebase...')
  run('firebase', ['deploy', '--config', 'firebase.json', '--only', 'hosting', '--project', projectId, '--non-interactive'])
  undoRelease = null
  console.log('\n✨ Published successfully!')
  console.log(`📱 URL: https://${projectId}.web.app`)
  console.log(`📦 Version: ${newVersion}`)

  const tag = releaseTag(newVersion)
  console.log(`\n⬆️  Pushing the release commits and tag ${tag}...`)
  try {
    pushRelease(root, branch, newVersion)
  } catch (error) {
    // Already published: the release stays, it only needs to be pushed.
    console.error(`\n⚠️  Published, but the push failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error(`   Push it when you can: git push --atomic ${remoteOf(root, branch)} ${branch} ${tag}\n`)
    process.exit(1)
  }
  console.log(`✅ Release ${tag} pushed.\n`)
}
