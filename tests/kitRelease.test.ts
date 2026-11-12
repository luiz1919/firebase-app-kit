import assert from 'node:assert/strict'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { generatedNotes, parseReleaseArgs, release, releaseCommitMessage } from '../scripts/release.ts'
import { git } from '../src/deploy.ts'
import { todayIso } from '../src/utils/dates.ts'

const base = mkdtempSync(join(tmpdir(), 'firebase-app-kit-kit-release-'))
after(() => rmSync(base, { recursive: true, force: true }))
let count = 0

const CHANGELOG = `# Changelog

## Unreleased

### Changed

- Resolved feedback goes back to the list.

## v0.17.0 - 2026-11-12

- Filters.
`

const PASSING_CHECK = `node -e "require('fs').writeFileSync('dist.txt', 'built')"`

/** A kit repo on "main" at v0.17.0 (tagged and pushed to a local bare repo that plays GitHub), with uncommitted work. */
function setupKit({ check = PASSING_CHECK, changelog = CHANGELOG } = {}) {
  const dir = join(base, `case-${count++}`)
  const remote = `${dir}-remote.git`
  git(base, ['init', '-q', '--bare', '-b', 'main', remote])
  git(base, ['init', '-q', '-b', 'main', dir])
  for (const [key, value] of [['user.name', 'Test'], ['user.email', 'test@example.com'], ['commit.gpgsign', 'false'], ['tag.gpgSign', 'false']]) {
    git(dir, ['config', key, value])
  }
  const pkg = { name: 'kit', version: '0.17.0', scripts: { check } }
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
  writeFileSync(join(dir, 'package-lock.json'), `${JSON.stringify({ name: 'kit', version: '0.17.0', packages: { '': { name: 'kit', version: '0.17.0' } } }, null, 2)}\n`)
  writeFileSync(join(dir, 'CHANGELOG.md'), changelog)
  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'src', 'feedback.ts'), 'export const a = 1\n')
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'v0.17.0: filters'])
  git(dir, ['tag', '-a', 'v0.17.0', '-m', 'v0.17.0: filters'])
  git(dir, ['remote', 'add', 'origin', remote])
  git(dir, ['push', '-q', '-u', 'origin', 'main', 'v0.17.0'])
  // The work being released, not committed yet.
  writeFileSync(join(dir, 'src', 'feedback.ts'), 'export const a = 2\n')
  writeFileSync(join(dir, 'src', 'new.ts'), 'export const b = 1\n')
  return { dir, remote }
}

async function runRelease(dir: string, args: string[], answers?: string[]) {
  const lines: string[] = []
  const ask = answers ? async (question: string) => { lines.push(question); return answers.shift() ?? '' } : null
  const code = await release({ root: dir, args, ask, log: (line) => lines.push(line), stdio: 'ignore' })
  return { code, output: lines.join('\n') }
}

const RELEASE_ARGS = ['--minor', '-m', 'resolved feedback goes back to the list', '-m', 'Co-Authored-By: Someone <someone@example.com>', '--yes']

test('parseReleaseArgs reads the type, the -m paragraphs, --yes and --check', () => {
  assert.deepEqual(parseReleaseArgs([]), { checkOnly: false, versionType: null, messages: [], yes: false })
  assert.deepEqual(parseReleaseArgs(['--minor', '-m', ' summary ', '--message', 'more', '-y']), { checkOnly: false, versionType: 'minor', messages: ['summary', 'more'], yes: true })
  assert.deepEqual(parseReleaseArgs(['--check', '--patch']), { checkOnly: true, versionType: 'patch', messages: [], yes: false })
  assert.equal(parseReleaseArgs(['--minor', '--major']), null)
  assert.equal(parseReleaseArgs(['-m']), null)
  assert.equal(parseReleaseArgs(['-m', '  ']), null)
  assert.equal(parseReleaseArgs(['minor']), null)
})

test('releaseCommitMessage: summary, CHANGELOG entries without # headings, then the extra paragraphs', () => {
  assert.equal(
    releaseCommitMessage('v1.2.0', ['new thing', 'Co-Authored-By: A <a@b>'], ['### Changed', '', '- One.', '', '### Upgrade', '', '- Run x.']),
    'v1.2.0: new thing\n\nChanged:\n\n- One.\n\nUpgrade:\n\n- Run x.\n\nCo-Authored-By: A <a@b>',
  )
  assert.equal(releaseCommitMessage('v1.2.1', ['fix'], ['- Fixed.']), 'v1.2.1: fix\n\n- Fixed.')
  assert.equal(releaseCommitMessage('v1.2.2', [], ['- Fixed.']), 'v1.2.2\n\n- Fixed.')
})

test('generatedNotes: the commit notes, then the changed files without dist/ and the CHANGELOG', () => {
  assert.deepEqual(
    generatedNotes(['feat(ui): dark mode', 'v0.17.0: old release'], ['CHANGELOG.md', 'dist/ui/a.js', 'src/ui/a.tsx', 'scripts/release.ts']),
    ['Dark mode', 'Changed files: `src/ui/a.tsx`, `scripts/release.ts`.'],
  )
  assert.deepEqual(generatedNotes([], ['dist/a.js']), [])
})

test('a release commits the work, the version, the CHANGELOG and the build, tags it and pushes both', async () => {
  const { dir, remote } = setupKit()
  const { code, output } = await runRelease(dir, RELEASE_ARGS)
  assert.equal(code, 0, output)
  assert.match(output, /0\.17\.0 -> 0\.18\.0 \(MINOR\), tag v0\.18\.0/)
  assert.match(output, /src\/feedback\.ts\n {3}src\/new\.ts/)

  assert.equal(git(dir, ['status', '--porcelain']), '')
  assert.equal(git(dir, ['log', '-1', '--format=%B']), [
    'v0.18.0: resolved feedback goes back to the list', '', 'Changed:', '', '- Resolved feedback goes back to the list.', '',
    'Co-Authored-By: Someone <someone@example.com>',
  ].join('\n'))
  assert.deepEqual(git(dir, ['show', '--name-only', '--format=', 'HEAD']).split('\n').sort(),
    ['CHANGELOG.md', 'dist.txt', 'package-lock.json', 'package.json', 'src/feedback.ts', 'src/new.ts'])
  assert.equal(JSON.parse(git(dir, ['show', 'HEAD:package.json'])).version, '0.18.0')
  assert.equal(JSON.parse(git(dir, ['show', 'HEAD:package-lock.json'])).packages[''].version, '0.18.0')
  const changelog = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')
  assert.match(changelog, new RegExp(`## Unreleased\\n\\n_Nothing yet._\\n\\n## v0\\.18\\.0 - ${todayIso()}\\n\\n### Changed\\n\\n- Resolved feedback goes back to the list\\.\\n\\n## v0\\.17\\.0`))

  assert.equal(git(dir, ['cat-file', '-t', 'v0.18.0']), 'tag')
  assert.equal(git(dir, ['tag', '-l', '--format=%(contents:subject)', 'v0.18.0']), 'v0.18.0: resolved feedback goes back to the list')
  assert.equal(git(remote, ['rev-parse', 'main']), git(dir, ['rev-parse', 'HEAD']))
  assert.equal(git(remote, ['rev-parse', 'v0.18.0^{commit}']), git(dir, ['rev-parse', 'HEAD']))
})

test('if npm run check fails, the version and CHANGELOG go back and the work stays uncommitted', async () => {
  const { dir, remote } = setupKit({ check: 'node -e "process.exit(1)"' })
  const head = git(dir, ['rev-parse', 'HEAD'])
  const { code, output } = await runRelease(dir, RELEASE_ARGS)
  assert.equal(code, 1)
  assert.match(output, /Undone/)
  assert.match(output, /npm run check failed/)
  assert.equal(git(dir, ['rev-parse', 'HEAD']), head)
  assert.equal(git(dir, ['tag', '-l', 'v0.18.0']), '')
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version, '0.17.0')
  assert.equal(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8'), CHANGELOG)
  assert.equal(readFileSync(join(dir, 'src', 'feedback.ts'), 'utf8'), 'export const a = 2\n')
  assert.equal(git(remote, ['tag', '-l', 'v0.18.0']), '')
})

const EMPTY_UNRELEASED = '# Changelog\n\n## Unreleased\n\n_Nothing yet._\n\n## v0.17.0 - 2026-11-12\n\n- Filters.\n'

test('just --minor --yes: with nothing under "Unreleased", the CHANGELOG lists the commits and the changed files', async () => {
  const { dir } = setupKit({ changelog: EMPTY_UNRELEASED })
  git(dir, ['add', 'src/new.ts'])
  git(dir, ['commit', '-q', '-m', 'feat: new helper'])
  const { code, output } = await runRelease(dir, ['--minor', '--yes'])
  assert.equal(code, 0, output)
  assert.match(output, /nothing under "Unreleased", so v0\.18\.0/)
  const changelog = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')
  assert.match(changelog, new RegExp(`## Unreleased\\n\\n_Nothing yet._\\n\\n## v0\\.18\\.0 - ${todayIso()}\\n\\n- New helper\\n- Changed files: \`src/feedback\\.ts\`\\.\\n\\n## v0\\.17\\.0`))
  assert.equal(git(dir, ['log', '-1', '--format=%B']), 'v0.18.0\n\n- New helper\n- Changed files: `src/feedback.ts`.')
  assert.equal(git(dir, ['tag', '-l', '--format=%(contents:subject)', 'v0.18.0']), 'v0.18.0')
  assert.equal(git(dir, ['status', '--porcelain']), '')
})

test('with no commits or changes since the last tag there is nothing to release', async () => {
  const { dir } = setupKit({ changelog: EMPTY_UNRELEASED })
  git(dir, ['checkout', '-q', '--', '.'])
  rmSync(join(dir, 'src', 'new.ts'))
  const { code, output } = await runRelease(dir, ['--minor', '--yes'])
  assert.equal(code, 1)
  assert.match(output, /Nothing to release: no commits or changes since v0\.17\.0/)
  assert.equal(git(dir, ['tag', '-l', 'v0.18.0']), '')
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version, '0.17.0')
})

test('if only the push fails, the commit and tag stay and it says how to push them', async () => {
  const { dir, remote } = setupKit()
  const hook = join(remote, 'hooks', 'pre-receive')
  writeFileSync(hook, '#!/bin/sh\necho "rejected for the test" >&2\nexit 1\n')
  chmodSync(hook, 0o755)
  const { code, output } = await runRelease(dir, RELEASE_ARGS)
  assert.equal(code, 1)
  assert.match(output, /git push --atomic origin main v0\.18\.0/)
  assert.equal(git(dir, ['log', '-1', '--format=%s']), 'v0.18.0: resolved feedback goes back to the list')
  assert.equal(git(dir, ['tag', '-l', 'v0.18.0']), 'v0.18.0')
  assert.equal(git(remote, ['tag', '-l', 'v0.18.0']), '')
})

test('--check runs the checks and changes nothing in git', async () => {
  const { dir } = setupKit()
  const head = git(dir, ['rev-parse', 'HEAD'])
  const { code, output } = await runRelease(dir, ['--check', '--patch', '-m', 'fix'])
  assert.equal(code, 0, output)
  assert.match(output, /0\.17\.0 -> 0\.17\.1 \(PATCH\)/)
  assert.equal(git(dir, ['rev-parse', 'HEAD']), head)
  assert.equal(git(dir, ['tag', '-l', 'v0.17.1']), '')
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version, '0.17.0')
  assert.equal(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8'), CHANGELOG)
})

test('without a terminal, the type and --yes must be given', async () => {
  const { dir } = setupKit()
  assert.equal((await runRelease(dir, ['-m', 'x', '--yes'])).code, 2)
  assert.equal((await runRelease(dir, ['--minor'])).code, 2)
  assert.equal(git(dir, ['tag', '-l', 'v0.18.0']), '')
})

test('in a terminal, just --minor shows the summary and asks once; "n" changes nothing', async () => {
  const { dir } = setupKit()
  const head = git(dir, ['rev-parse', 'HEAD'])
  const { code, output } = await runRelease(dir, ['--minor'], ['n'])
  assert.equal(code, 1)
  assert.match(output, /💬 Commit:\n {3}v0\.18\.0\n/)
  assert.match(output, /Release v0\.18\.0 and push it to GitHub\? \(y\/N\) \nCancelled: nothing changed\./)
  assert.equal(git(dir, ['rev-parse', 'HEAD']), head)
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version, '0.17.0')

  const accepted = await runRelease(dir, ['--minor'], ['s'])
  assert.equal(accepted.code, 0, accepted.output)
  assert.equal(git(dir, ['log', '-1', '--format=%s']), 'v0.18.0')
})
