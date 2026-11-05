// Configuracion web de Firebase. Sin dependencias: la usan el navegador, el plugin de Vite y el deploy.
const ENV_KEYS = {
    apiKey: 'VITE_FIREBASE_API_KEY',
    authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
    projectId: 'VITE_FIREBASE_PROJECT_ID',
    storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'VITE_FIREBASE_APP_ID',
};
/**
 * Lee la configuracion de las variables VITE_FIREBASE_* (.env.local). Los campos vacios o que
 * faltan se toman de `fallback` (por ejemplo, el archivo firebaseConfig que lee el plugin de Vite).
 */
export function firebaseConfigFromEnv(env, fallback = {}) {
    const config = {};
    for (const field of Object.keys(ENV_KEYS)) {
        const value = env[ENV_KEYS[field]];
        config[field] = typeof value === 'string' && value ? value : fallback[field];
    }
    return config;
}
/** Hay configuracion real: no faltan los campos imprescindibles ni quedan los textos de .env.example. */
export function isFirebaseConfigured(config) {
    return Boolean(config.apiKey && config.projectId && config.appId && !config.apiKey.startsWith('PEGA_AQUI'));
}
