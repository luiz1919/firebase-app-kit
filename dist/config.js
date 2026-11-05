// Firebase web config. No dependencies: used by the browser, the Vite plugin and the deploy.
const ENV_KEYS = {
    apiKey: 'VITE_FIREBASE_API_KEY',
    authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
    projectId: 'VITE_FIREBASE_PROJECT_ID',
    storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'VITE_FIREBASE_APP_ID',
};
/**
 * Reads the config from the VITE_FIREBASE_* variables (.env.local). Empty or missing fields
 * are taken from `fallback` (for example, the firebaseConfig file read by the Vite plugin).
 */
export function firebaseConfigFromEnv(env, fallback = {}) {
    const config = {};
    for (const field of Object.keys(ENV_KEYS)) {
        const value = env[ENV_KEYS[field]];
        config[field] = typeof value === 'string' && value ? value : fallback[field];
    }
    return config;
}
/** There is a real config: no required field is missing and no .env.example placeholder is left. */
export function isFirebaseConfigured(config) {
    return Boolean(config.apiKey && config.projectId && config.appId && !config.apiKey.startsWith('PEGA_AQUI'));
}
