import { initializeApp } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import type { Auth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { isFirebaseConfigured } from './config.ts'
import type { FirebaseWebConfig } from './config.ts'
import { chooseFirebaseConfig, storedAppEnv } from './env.ts'
import type { AppEnvironment } from './env.ts'

export interface FirebaseServices {
  isConfigured: boolean
  app: FirebaseApp | null
  auth: Auth | null
  db: Firestore | null
  /** Project in use: production, or the dev one ("Pruebas") if it was chosen on this device. */
  environment: AppEnvironment
}

export interface InitFirebaseOptions {
  /**
   * Config of a separate dev project with test data ("Pruebas"), e.g.
   * firebaseConfigFromEnv(import.meta.env, __FIREBASE_DEV_CONFIG__, 'dev'). It is used only when
   * chosen in "Acerca de" (About), and only if it is complete and of another project.
   */
  dev?: FirebaseWebConfig
}

/**
 * Starts Firebase if the config is complete. Otherwise everything is null and the app
 * can show its "setup pending" notice.
 *
 * Firestore uses the browser's persistent cache (IndexedDB), shared across tabs:
 * offline, data can still be read and pending changes are uploaded when back online.
 * Each project has its own cache and its own session, so production and dev data never mix.
 */
export function initFirebase(prodConfig: FirebaseWebConfig, options: InitFirebaseOptions = {}): FirebaseServices {
  const { config, environment } = chooseFirebaseConfig(prodConfig, options.dev, storedAppEnv())
  const isConfigured = isFirebaseConfigured(config)
  const app = isConfigured ? initializeApp(config) : null
  return {
    isConfigured,
    app,
    auth: app ? getAuth(app) : null,
    db: app
      ? initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        })
      : null,
    environment,
  }
}
