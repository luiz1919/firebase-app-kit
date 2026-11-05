import assert from 'node:assert/strict'
import { test } from 'node:test'
import { firebaseConfigFromEnv, isFirebaseConfigured } from '../src/config.ts'

const complete = { apiKey: 'key', projectId: 'demo', appId: 'app' }

test('las variables VITE_FIREBASE_* tienen prioridad y las vacias usan la alternativa', () => {
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

test('sin variables ni alternativa no hay configuracion', () => {
  assert.equal(isFirebaseConfigured(firebaseConfigFromEnv({})), false)
})

test('isFirebaseConfigured exige apiKey, projectId y appId reales', () => {
  assert.equal(isFirebaseConfigured(complete), true)
  assert.equal(isFirebaseConfigured({ ...complete, appId: '' }), false)
  assert.equal(isFirebaseConfigured({ ...complete, projectId: undefined }), false)
  assert.equal(isFirebaseConfigured({ ...complete, apiKey: 'PEGA_AQUI_apiKey' }), false)
})
