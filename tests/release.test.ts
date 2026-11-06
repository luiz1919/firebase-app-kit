import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { commitSubjectsSince, createRelease, git, gitReleaseProblem, lastReleaseTag, pushRelease, releaseTag, tagExists } from '../src/deploy.ts'

const base = mkdtempSync(join(tmpdir(), 'firebase-app-kit-release-'))
after(() => rmSync(base, { recursive: true, force: true }))
let count = 0

/** An app repo on "main" with package.json at 1.2.3, linked to a local bare repo that plays GitHub. */
function setupRepo() {
  const dir = join(base, `case-${count++}`)
  const remote = `${dir}-remote.git`
  git(base, ['init', '-q', '--bare', '-b', 'main', remote])
  git(base, ['init', '-q', '-b', 'main', dir])
  for (const [key, value] of [['user.name', 'Test'], ['user.email', 'test@example.com'], ['commit.gpgsign', 'false'], ['tag.gpgSign', 'false']]) {
    git(dir, ['config', key, value])
  }
  writeFileSync(join(dir, 'package.json'), '{\n  "name": "app",\n  "version": "1.2.3"\n}\n')
  writeFileSync(join(dir, 'package-lock.json'), '{\n  "name": "app",\n  "version": "1.2.3",\n  "packages": {\n    "": { "name": "app", "version": "1.2.3" }\n  }\n}\n')
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'feat: first'])
  git(dir, ['remote', 'add', 'origin', remote])
  git(dir, ['push', '-q', '-u', 'origin', 'main'])
  return { dir, remote }
}

test('gitReleaseProblem accepts a clean, up-to-date release branch', () => {
  const { dir } = setupRepo()
  assert.equal(gitReleaseProblem(dir, 'main'), null)
})

test('gitReleaseProblem rejects uncommitted changes, another branch, no remote and being behind', () => {
  const { dir, remote } = setupRepo()
  writeFileSync(join(dir, 'new.txt'), 'x')
  assert.match(gitReleaseProblem(dir, 'main') ?? '', /uncommitted changes/)
  rmSync(join(dir, 'new.txt'))

  git(dir, ['checkout', '-q', '-b', 'feature'])
  assert.match(gitReleaseProblem(dir, 'main') ?? '', /"main" branch, and you are on "feature"/)
  git(dir, ['checkout', '-q', 'main'])

  // Someone else pushed a commit from another machine.
  const other = join(base, `other-${count++}`)
  git(base, ['clone', '-q', remote, other])
  git(other, ['config', 'user.name', 'Other'])
  git(other, ['config', 'user.email', 'other@example.com'])
  writeFileSync(join(other, 'other.txt'), 'x')
  git(other, ['add', '.'])
  git(other, ['commit', '-q', '-m', 'feat: from another machine'])
  git(other, ['push', '-q'])
  assert.match(gitReleaseProblem(dir, 'main') ?? '', /1 commit\(s\) behind origin\/main: run git pull/)

  const lonely = setupRepo().dir
  git(lonely, ['branch', '--unset-upstream'])
  assert.match(gitReleaseProblem(lonely, 'main') ?? '', /not linked to a remote branch/)
})

test('createRelease commits the version and tags it; undo leaves everything as it was', () => {
  const { dir } = setupRepo()
  const before = git(dir, ['rev-parse', 'HEAD'])
  const pkgBefore = readFileSync(join(dir, 'package.json'), 'utf8')
  const undo = createRelease(dir, '1.3.0')

  assert.equal(git(dir, ['log', '-1', '--format=%s']), 'chore(release): v1.3.0')
  assert.equal(git(dir, ['show', '--name-only', '--format=', 'HEAD']), 'package-lock.json\npackage.json')
  assert.equal(JSON.parse(readFileSync(join(dir, 'package-lock.json'), 'utf8')).packages[''].version, '1.3.0')
  assert.equal(tagExists(dir, 'v1.3.0'), true)
  assert.equal(git(dir, ['rev-parse', 'v1.3.0^{commit}']), git(dir, ['rev-parse', 'HEAD']))
  assert.equal(git(dir, ['status', '--porcelain']), '')

  undo()
  assert.equal(git(dir, ['rev-parse', 'HEAD']), before)
  assert.equal(tagExists(dir, 'v1.3.0'), false)
  assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), pkgBefore)
  assert.equal(git(dir, ['status', '--porcelain']), '')
})

test('pushRelease pushes the release commit and the tag together', () => {
  const { dir, remote } = setupRepo()
  createRelease(dir, '1.2.4')
  pushRelease(dir, 'main', '1.2.4')
  assert.equal(git(remote, ['rev-parse', 'main']), git(dir, ['rev-parse', 'HEAD']))
  assert.equal(git(remote, ['rev-parse', 'v1.2.4^{commit}']), git(dir, ['rev-parse', 'HEAD']))
  assert.equal(releaseTag('1.2.4'), 'v1.2.4')
  assert.equal(gitReleaseProblem(dir, 'main'), null)
})

test('createRelease with a changelog commits it first; undo leaves everything as it was', () => {
  const { dir } = setupRepo()
  writeFileSync(join(dir, 'Changelog.md'), '# Changelog\n')
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'docs: add changelog'])
  const before = git(dir, ['rev-parse', 'HEAD'])
  const undo = createRelease(dir, '1.3.0', { file: 'Changelog.md', content: '# Changelog\n\n## v1.3.0\n' })

  assert.equal(git(dir, ['log', '-2', '--format=%s']), 'chore(release): v1.3.0\ndocs(changelog): v1.3.0')
  assert.equal(git(dir, ['show', '--name-only', '--format=', 'HEAD~1']), 'Changelog.md')
  assert.equal(git(dir, ['show', '--name-only', '--format=', 'HEAD']), 'package-lock.json\npackage.json')
  assert.equal(readFileSync(join(dir, 'Changelog.md'), 'utf8'), '# Changelog\n\n## v1.3.0\n')
  assert.equal(git(dir, ['rev-parse', 'v1.3.0^{commit}']), git(dir, ['rev-parse', 'HEAD']))
  assert.equal(git(dir, ['status', '--porcelain']), '')

  undo()
  assert.equal(git(dir, ['rev-parse', 'HEAD']), before)
  assert.equal(tagExists(dir, 'v1.3.0'), false)
  assert.equal(readFileSync(join(dir, 'Changelog.md'), 'utf8'), '# Changelog\n')
  assert.equal(git(dir, ['status', '--porcelain']), '')

  // A changelog that did not exist is created, and removed again by undo.
  createRelease(dir, '1.3.0', { file: 'NEW.md', content: '# New\n' })()
  assert.equal(git(dir, ['rev-parse', 'HEAD']), before)
  assert.equal(git(dir, ['status', '--porcelain']), '')
})

test('lastReleaseTag and commitSubjectsSince list the commits after the latest release', () => {
  const { dir } = setupRepo()
  assert.equal(lastReleaseTag(dir), null)
  assert.deepEqual(commitSubjectsSince(dir, null), ['feat: first'])
  createRelease(dir, '1.2.4')
  for (const subject of ['fix: a', 'feat: b']) {
    writeFileSync(join(dir, `${subject.slice(-1)}.txt`), subject)
    git(dir, ['add', '.'])
    git(dir, ['commit', '-q', '-m', subject])
  }
  assert.equal(lastReleaseTag(dir), 'v1.2.4')
  assert.deepEqual(commitSubjectsSince(dir, 'v1.2.4'), ['fix: a', 'feat: b'])
})
