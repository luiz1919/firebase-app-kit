import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { firebaseAppKit, readFirebaseConfigFile } from '../src/vite.ts'

const dir = mkdtempSync(join(tmpdir(), 'firebase-app-kit-'))
after(() => rmSync(dir, { recursive: true, force: true }))

// This is how the Firebase console copies it.
const CONSOLE_SNIPPET = `// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "key",
  authDomain: "demo.firebaseapp.com",
  "projectId": "demo",
  storageBucket: "demo.firebasestorage.app",
  messagingSenderId: "123",
  appId: "1:123:web:abc",
  other: "ignored"
};
const app = initializeApp(firebaseConfig);
`

test('lee el objeto firebaseConfig sin ejecutar el archivo', async () => {
  const file = join(dir, 'firebaseConfig')
  writeFileSync(file, CONSOLE_SNIPPET)
  assert.deepEqual(await readFirebaseConfigFile(file), {
    apiKey: 'key',
    authDomain: 'demo.firebaseapp.com',
    projectId: 'demo',
    storageBucket: 'demo.firebasestorage.app',
    messagingSenderId: '123',
    appId: '1:123:web:abc',
  })
})

test('sin archivo devuelve {}', async () => {
  assert.deepEqual(await readFirebaseConfigFile(join(dir, 'no-existe')), {})
})

test('un archivo incompleto es un error', async () => {
  const file = join(dir, 'incompleto')
  writeFileSync(file, 'const firebaseConfig = { apiKey: "key" }')
  await assert.rejects(readFirebaseConfigFile(file), /apiKey, projectId y appId/)
})

type ConfigHook = (config: { root?: string }, env: { command: 'build' | 'serve'; mode: string }) => Promise<{ define: Record<string, string> }>

test('el plugin define version, commit, fecha y configuracion', async () => {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '1.2.3' }))
  const plugin = firebaseAppKit({ firebaseConfigFile: 'firebaseConfig' })
  const config = plugin.config as unknown as ConfigHook

  const build = await config({ root: dir }, { command: 'build', mode: 'production' })
  assert.equal(JSON.parse(build.define.__APP_VERSION__), '1.2.3')
  assert.equal(typeof JSON.parse(build.define.__APP_COMMIT__), 'string')
  assert.ok(!Number.isNaN(Date.parse(JSON.parse(build.define.__BUILD_TIME__))))
  assert.equal(JSON.parse(build.define.__FIREBASE_CONFIG__).projectId, 'demo')

  const dev = await config({ root: dir }, { command: 'serve', mode: 'development' })
  assert.equal(JSON.parse(dev.define.__BUILD_TIME__), '')
})

test('sin firebaseConfigFile la configuracion es {}', async () => {
  const config = firebaseAppKit().config as unknown as ConfigHook
  const result = await config({ root: dir }, { command: 'build', mode: 'production' })
  assert.deepEqual(JSON.parse(result.define.__FIREBASE_CONFIG__), {})
})
