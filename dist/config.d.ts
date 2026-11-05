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
 * Reads the config from the VITE_FIREBASE_* variables (.env.local). Empty or missing fields
 * are taken from `fallback` (for example, the firebaseConfig file read by the Vite plugin).
 */
export declare function firebaseConfigFromEnv(env: Readonly<Record<string, unknown>>, fallback?: FirebaseWebConfig): FirebaseWebConfig;
/** There is a real config: no required field is missing and no .env.example placeholder is left. */
export declare function isFirebaseConfigured(config: FirebaseWebConfig): boolean;
