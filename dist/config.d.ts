/** Campos de la configuracion web de Firebase (bloque firebaseConfig de la consola). */
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
 * Lee la configuracion de las variables VITE_FIREBASE_* (.env.local). Los campos vacios o que
 * faltan se toman de `fallback` (por ejemplo, el archivo firebaseConfig que lee el plugin de Vite).
 */
export declare function firebaseConfigFromEnv(env: Readonly<Record<string, unknown>>, fallback?: FirebaseWebConfig): FirebaseWebConfig;
/** Hay configuracion real: no faltan los campos imprescindibles ni quedan los textos de .env.example. */
export declare function isFirebaseConfigured(config: FirebaseWebConfig): boolean;
