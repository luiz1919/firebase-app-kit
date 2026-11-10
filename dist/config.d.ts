/** Fields of the Firebase web config (the firebaseConfig block from the console). */
export interface FirebaseWebConfig {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
}
/**
 * Firebase project the app works with: 'prod' (the real data) or 'dev' (a separate project with
 * test data, "Pruebas" in the UI).
 */
export type AppEnv = 'prod' | 'dev';
/**
 * Reads the config from the VITE_FIREBASE_* variables (.env.local), or VITE_FIREBASE_DEV_* for
 * the dev project. Empty or missing fields are taken from `fallback` (for example, the
 * firebaseConfig file read by the Vite plugin).
 */
export declare function firebaseConfigFromEnv(env: Readonly<Record<string, unknown>>, fallback?: FirebaseWebConfig, appEnv?: AppEnv): FirebaseWebConfig;
/** There is a real config: no required field is missing and no .env.example placeholder is left. */
export declare function isFirebaseConfigured(config: FirebaseWebConfig): boolean;
/**
 * Reason the dev project's config cannot be used, or null if it is fine. It must be complete and
 * belong to a project other than the real one: test data must never be written to the real one.
 */
export declare function devConfigProblem(dev: FirebaseWebConfig, prod: FirebaseWebConfig): string | null;
