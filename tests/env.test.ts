import assert from 'node:assert/strict'
import { test } from 'node:test'
import { devConfigProblem, firebaseConfigFromEnv } from '../src/config.ts'
import { APP_ENV_STORAGE_KEY, assertDevEnvironment, chooseFirebaseConfig, storedAppEnv } from '../src/env.ts'

const prod = { apiKey: 'prod-key', projectId: 'app-prod', appId: 'prod-app' }
const dev = { apiKey: 'dev-key', projectId: 'app-dev', appId: 'dev-app' }

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value) }
}

test('VITE_FIREBASE_DEV_* variables fill the dev config, and never the production one', () => {
  const env = { VITE_FIREBASE_API_KEY: 'prod-env', VITE_FIREBASE_DEV_API_KEY: 'dev-env', VITE_FIREBASE_DEV_PROJECT_ID: '' }
  const devConfig = firebaseConfigFromEnv(env, { projectId: 'from-file', appId: 'file-app' }, 'dev')
  assert.equal(devConfig.apiKey, 'dev-env')
  assert.equal(devConfig.projectId, 'from-file')
  assert.equal(firebaseConfigFromEnv(env).apiKey, 'prod-env')
})

test('the dev config must be complete and of another project', () => {
  assert.equal(devConfigProblem(dev, prod), null)
  assert.match(devConfigProblem({ ...dev, appId: '' }, prod) ?? '', /incomplete/)
  assert.match(devConfigProblem({ ...dev, projectId: 'app-prod' }, prod) ?? '', /production project/)
})

test('the stored choice is "prod" unless "dev" was saved, even if storage fails', () => {
  assert.equal(storedAppEnv(memoryStorage()), 'prod')
  assert.equal(storedAppEnv(memoryStorage({ [APP_ENV_STORAGE_KEY]: 'dev' })), 'dev')
  assert.equal(storedAppEnv(memoryStorage({ [APP_ENV_STORAGE_KEY]: 'otra' })), 'prod')
  assert.equal(storedAppEnv(null), 'prod')
  assert.equal(storedAppEnv({ getItem: () => { throw new Error('blocked') }, setItem: () => {} }), 'prod')
})

test('the dev project is used only when chosen and usable', () => {
  assert.deepEqual(chooseFirebaseConfig(prod, dev, 'dev'), { config: dev, environment: { current: 'dev', devAvailable: true, projectId: 'app-dev' } })
  assert.deepEqual(chooseFirebaseConfig(prod, dev, 'prod').environment, { current: 'prod', devAvailable: true, projectId: 'app-prod' })
  // No dev config, an incomplete one, or one of the production project: always production.
  for (const unusable of [undefined, {}, { ...dev, apiKey: '' }, { ...dev, projectId: 'app-prod' }]) {
    const { config, environment } = chooseFirebaseConfig(prod, unusable, 'dev')
    assert.equal(config, prod)
    assert.deepEqual(environment, { current: 'prod', devAvailable: false, projectId: 'app-prod' })
  }
})

test('test data can only be written in the dev project', () => {
  assert.doesNotThrow(() => assertDevEnvironment({ current: 'dev', devAvailable: true, projectId: 'app-dev' }))
  assert.throws(() => assertDevEnvironment({ current: 'prod', devAvailable: true, projectId: 'app-prod' }), /solo .* en Pruebas/)
})
