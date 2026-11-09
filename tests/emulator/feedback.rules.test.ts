// The kit's feedback rules in the emulator (npm run test:rules), inside a minimal firestore.rules
// that denies everything else, like the apps' rules do.
import assert from 'node:assert/strict'
import { after, before } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { kitRulesSnippet } from '../../src/rules.ts'
import { feedbackRulesTests } from '../../src/rulesTesting.ts'

const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
${kitRulesSnippet('feedback')}

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`
let environment: RulesTestEnvironment

before(async () => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8089', 'Run through npm run test:rules; real Firebase is never used.')
  environment = await initializeTestEnvironment({ projectId: 'demo-firebase-app-kit', firestore: { host: '127.0.0.1', port: 8089, rules } })
})
after(async () => { await environment?.cleanup() })

feedbackRulesTests({ environment: () => environment, assertSucceeds, assertFails, rules })
