import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { buildFirebaseConfig, firebaseConfigProblem, incrementVersion, isSemver, parseDeployArgs, writeVersion } from '../src/deploy.ts'

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
