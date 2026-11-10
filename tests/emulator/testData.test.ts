// commitInBatches against the emulator (npm run test:rules), with rules that allow only seed/.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getCountFromServer } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { commitInBatches } from '../../src/testData.ts'
import type { BatchWrite, WriteProgress } from '../../src/testData.ts'

const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /seed/{id} { allow read, write: if request.auth != null; }
  }
}
`
let environment: RulesTestEnvironment

before(async () => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8089', 'Run through npm run test:rules; real Firebase is never used.')
  environment = await initializeTestEnvironment({ projectId: 'demo-firebase-app-kit-test-data', firestore: { host: '127.0.0.1', port: 8089, rules } })
})
after(async () => { await environment?.cleanup() })

test('commitInBatches writes everything in batches and reports the progress after each one', async () => {
  const db = environment.authenticatedContext('ana').firestore() as unknown as Firestore
  const writes: BatchWrite[] = Array.from({ length: 950 }, (_, index) => (batch) => {
    batch.set(doc(db, 'seed', `s${index}`), { index })
  })
  const progress: WriteProgress[] = []
  await commitInBatches(db, writes, (step) => progress.push(step), 400)
  assert.deepEqual(progress.map((step) => step.done), [0, 400, 800, 950])
  assert.ok(progress.every((step) => step.total === 950))
  assert.equal((await getCountFromServer(collection(db, 'seed'))).data().count, 950)
})

test('a batch the rules deny stops with its error', async () => {
  const db = environment.authenticatedContext('ana').firestore() as unknown as Firestore
  await assert.rejects(commitInBatches(db, [(batch) => batch.set(doc(db, 'other', 'x'), { a: 1 })]), /permission/i)
})
