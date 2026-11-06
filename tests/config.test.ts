import assert from 'node:assert/strict'
import { test } from 'node:test'
import { firebaseConfigFromEnv, isFirebaseConfigured } from '../src/config.ts'

const complete = { apiKey: 'key', projectId: 'demo', appId: 'app' }

test('VITE_FIREBASE_* variables take precedence and empty ones use the fallback', () => {
  const config = firebaseConfigFromEnv(
    { VITE_FIREBASE_API_KEY: 'env-key', VITE_FIREBASE_PROJECT_ID: '', OTHER: 'x' },
    { apiKey: 'file-key', projectId: 'file-project', appId: 'file-app' },
  )
  assert.deepEqual(config, {
    apiKey: 'env-key',
    authDomain: undefined,
    projectId: 'file-project',
    storageBucket: undefined,
    messagingSenderId: undefined,
    appId: 'file-app',
  })
})

test('without variables or fallback there is no config', () => {
  assert.equal(isFirebaseConfigured(firebaseConfigFromEnv({})), false)
})

test('isFirebaseConfigured requires real apiKey, projectId and appId', () => {
  assert.equal(isFirebaseConfigured(complete), true)
  assert.equal(isFirebaseConfigured({ ...complete, appId: '' }), false)
  assert.equal(isFirebaseConfigured({ ...complete, projectId: undefined }), false)
  assert.equal(isFirebaseConfigured({ ...complete, apiKey: 'PEGA_AQUI_apiKey' }), false)
})
