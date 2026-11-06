import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import {
  addChangelogVersion, buildFirebaseConfig, firebaseConfigProblem, githubRepoUrl, incrementVersion, isSemver, parseDeployArgs, releaseNotes,
  unreleasedNotes, writeVersion,
} from '../src/deploy.ts'

test('parseDeployArgs accepts no argument, --check or a change type', () => {
  assert.deepEqual(parseDeployArgs([]), { checkOnly: false, versionType: null })
  assert.deepEqual(parseDeployArgs(['--check']), { checkOnly: true, versionType: null })
  assert.deepEqual(parseDeployArgs(['--minor']), { checkOnly: false, versionType: 'minor' })
  assert.equal(parseDeployArgs(['--patch', '--check']), null)
  assert.equal(parseDeployArgs(['patch']), null)
  assert.equal(parseDeployArgs(['--mayor']), null)
})

test('incrementVersion follows semver', () => {
  assert.equal(incrementVersion('1.2.3', 'patch'), '1.2.4')
  assert.equal(incrementVersion('1.2.3', 'minor'), '1.3.0')
  assert.equal(incrementVersion('1.2.3', 'major'), '2.0.0')
  assert.equal(isSemver('1.2.3'), true)
  assert.equal(isSemver('1.2'), false)
  assert.equal(isSemver(undefined), false)
})

const dir = mkdtempSync(join(tmpdir(), 'firebase-app-kit-deploy-'))
after(() => rmSync(dir, { recursive: true, force: true }))

test('writeVersion updates package.json and package-lock.json, and can be undone', () => {
  const pkg = '{\n  "name": "app",\n  "version": "1.0.0"\n}\n'
  const lock = '{\n  "name": "app",\n  "version": "0.9.0",\n  "packages": {\n    "": { "name": "app", "version": "0.9.0" }\n  }\n}\n'
  writeFileSync(join(dir, 'package.json'), pkg)
  writeFileSync(join(dir, 'package-lock.json'), lock)

  const restore = writeVersion(dir, '1.0.1')
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version, '1.0.1')
  const written = JSON.parse(readFileSync(join(dir, 'package-lock.json'), 'utf8'))
  assert.equal(written.version, '1.0.1')
  assert.equal(written.packages[''].version, '1.0.1')

  restore()
  assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), pkg)
  assert.equal(readFileSync(join(dir, 'package-lock.json'), 'utf8'), lock)
})

test('writeVersion touches nothing if a file is not valid JSON', () => {
  const pkg = '{ "version": "1.0.0" }\n'
  writeFileSync(join(dir, 'package.json'), pkg)
  writeFileSync(join(dir, 'package-lock.json'), '{ roto')
  assert.throws(() => writeVersion(dir, '2.0.0'))
  assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), pkg)
})

test('buildFirebaseConfig combines .env and the file, and does not change process.env', async () => {
  const app = mkdtempSync(join(tmpdir(), 'firebase-app-kit-app-'))
  try {
    writeFileSync(join(app, 'package.json'), '{ "version": "1.0.0" }')
    writeFileSync(join(app, '.env.local'), 'VITE_FIREBASE_API_KEY=env-key\n')
    writeFileSync(join(app, 'firebaseConfig'), 'const firebaseConfig = { apiKey: "file-key", projectId: "demo", appId: "app" }')
    const pluginUrl = new URL('../src/vite.ts', import.meta.url).href
    writeFileSync(join(app, 'vite.config.mjs'), `import { firebaseAppKit } from ${JSON.stringify(pluginUrl)}\nexport default { plugins: [firebaseAppKit({ firebaseConfigFile: 'firebaseConfig' })] }\n`)

    const before = { ...process.env }
    const config = await buildFirebaseConfig(app)
    assert.deepEqual({ ...process.env }, before)
    assert.equal(config.apiKey, 'env-key')
    assert.equal(config.projectId, 'demo')
    assert.equal(firebaseConfigProblem(config, 'demo'), null)
  } finally {
    rmSync(app, { recursive: true, force: true })
  }
})

test('firebaseConfigProblem requires a complete config for the given project', () => {
  const config = { apiKey: 'key', projectId: 'demo', appId: 'app' }
  assert.equal(firebaseConfigProblem(config, 'demo'), null)
  assert.match(firebaseConfigProblem(config, 'other') ?? '', /"demo", not other/)
  assert.match(firebaseConfigProblem({ ...config, apiKey: 'PEGA_AQUI' }, 'demo') ?? '', /incomplete/)
})

test('releaseNotes drops release commits and conventional prefixes, capitalizes and removes repeats', () => {
  assert.deepEqual(
    releaseNotes([
      'feat(ui): add a storage bar',
      'chore(release): v1.2.3',
      'docs(changelog): v1.2.3',
      'arreglar el informe',
      'arreglar el informe',
      'Fix: wrong total',
      'Nota: esto se queda',
      '   ',
    ]),
    ['Add a storage bar', 'Arreglar el informe', 'Wrong total', 'Nota: esto se queda'],
  )
})

test('githubRepoUrl reads https and ssh remotes', () => {
  assert.equal(githubRepoUrl('https://luiz1919@github.com/luiz1919/community-assistant.git'), 'https://github.com/luiz1919/community-assistant')
  assert.equal(githubRepoUrl('git@github.com:ana/app.git'), 'https://github.com/ana/app')
  assert.equal(githubRepoUrl('ssh://git@github.com/ana/app'), 'https://github.com/ana/app')
  assert.equal(githubRepoUrl('https://gitlab.com/ana/app.git'), null)
})

const CHANGELOG = `# Changelog

Intro.

## Unreleased

_Nothing yet._

## [v1.0.0] - 2026-01-01

- First version

[v1.0.0]: https://github.com/ana/app/releases/tag/v1.0.0
`

const release = { version: '1.1.0', date: '2026-11-06', notes: ['Add tasks', 'Fix the report'], previousTag: 'v1.0.0', repoUrl: 'https://github.com/ana/app' }

test('addChangelogVersion adds the commit notes under a new version and keeps Unreleased empty', () => {
  assert.equal(addChangelogVersion(CHANGELOG, release), `# Changelog

Intro.

## Unreleased

_Nothing yet._

## [v1.1.0] - 2026-11-06

- Add tasks
- Fix the report

## [v1.0.0] - 2026-01-01

- First version

[v1.1.0]: https://github.com/ana/app/compare/v1.0.0...v1.1.0
[v1.0.0]: https://github.com/ana/app/releases/tag/v1.0.0
`)
})

test('addChangelogVersion prefers the entries written under Unreleased', () => {
  const content = CHANGELOG.replace('_Nothing yet._', '- Written by hand\n  with a second line\n')
  assert.deepEqual(unreleasedNotes(content), ['- Written by hand', '  with a second line'])
  assert.equal(unreleasedNotes(CHANGELOG), null)
  const updated = addChangelogVersion(content, release)
  assert.match(updated, /## Unreleased\n\n_Nothing yet\._\n\n## \[v1\.1\.0\] - 2026-11-06\n\n- Written by hand\n {2}with a second line\n\n## \[v1\.0\.0\]/)
  assert.doesNotMatch(updated, /Add tasks/)
})

test('addChangelogVersion works without Unreleased, without links, with no notes and without a file', () => {
  const plain = '# Changelog\n\n## v1.0.0 - 2026-01-01\n\n- First version\n'
  assert.equal(
    addChangelogVersion(plain, { ...release, repoUrl: null }),
    '# Changelog\n\n## v1.1.0 - 2026-11-06\n\n- Add tasks\n- Fix the report\n\n## v1.0.0 - 2026-01-01\n\n- First version\n',
  )
  assert.equal(
    addChangelogVersion(null, { ...release, notes: [], previousTag: null }),
    '# Changelog\n\n## Unreleased\n\n_Nothing yet._\n\n## [v1.1.0] - 2026-11-06\n\n- No changes since the previous version.\n\n' +
      '[v1.1.0]: https://github.com/ana/app/releases/tag/v1.1.0\n',
  )
  assert.equal(addChangelogVersion('# Changelog\n', { ...release, repoUrl: null }), '# Changelog\n\n## v1.1.0 - 2026-11-06\n\n- Add tasks\n- Fix the report\n')
})
