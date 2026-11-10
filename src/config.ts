// Firebase web config. No dependencies: used by the browser, the Vite plugin and the deploy.

/** Fields of the Firebase web config (the firebaseConfig block from the console). */
export interface FirebaseWebConfig {
  apiKey?: string
  authDomain?: string
  projectId?: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
  measurementId?: string
}

// Suffix of each VITE_FIREBASE_* variable (VITE_FIREBASE_DEV_* for the dev project).
const ENV_KEYS = {
  apiKey: 'API_KEY',
  authDomain: 'AUTH_DOMAIN',
  projectId: 'PROJECT_ID',
  storageBucket: 'STORAGE_BUCKET',
  messagingSenderId: 'MESSAGING_SENDER_ID',
  appId: 'APP_ID',
} as const

/**
 * Firebase project the app works with: 'prod' (the real data) or 'dev' (a separate project with
 * test data, "Pruebas" in the UI).
 */
export type AppEnv = 'prod' | 'dev'

/**
 * Reads the config from the VITE_FIREBASE_* variables (.env.local), or VITE_FIREBASE_DEV_* for
 * the dev project. Empty or missing fields are taken from `fallback` (for example, the
 * firebaseConfig file read by the Vite plugin).
 */
export function firebaseConfigFromEnv(
  env: Readonly<Record<string, unknown>>,
  fallback: FirebaseWebConfig = {},
  appEnv: AppEnv = 'prod',
): FirebaseWebConfig {
  const prefix = appEnv === 'dev' ? 'VITE_FIREBASE_DEV_' : 'VITE_FIREBASE_'
  const config: FirebaseWebConfig = {}
  for (const field of Object.keys(ENV_KEYS) as (keyof typeof ENV_KEYS)[]) {
    const value = env[`${prefix}${ENV_KEYS[field]}`]
    config[field] = typeof value === 'string' && value ? value : fallback[field]
  }
  return config
}

/** There is a real config: no required field is missing and no .env.example placeholder is left. */
export function isFirebaseConfigured(config: FirebaseWebConfig): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId && !config.apiKey.startsWith('PEGA_AQUI'))
}

/**
 * Reason the dev project's config cannot be used, or null if it is fine. It must be complete and
 * belong to a project other than the real one: test data must never be written to the real one.
 */
export function devConfigProblem(dev: FirebaseWebConfig, prod: FirebaseWebConfig): string | null {
  if (!isFirebaseConfigured(dev)) return 'The dev Firebase config is incomplete.'
  if (dev.projectId === prod.projectId) return `The dev Firebase config belongs to the production project (${dev.projectId}).`
  return null
}
