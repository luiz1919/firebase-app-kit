// Firebase web config. No dependencies: used by the browser, the Vite plugin and the deploy.
// Suffix of each VITE_FIREBASE_* variable (VITE_FIREBASE_DEV_* for the dev project).
const ENV_KEYS = {
    apiKey: 'API_KEY',
    authDomain: 'AUTH_DOMAIN',
    projectId: 'PROJECT_ID',
    storageBucket: 'STORAGE_BUCKET',
    messagingSenderId: 'MESSAGING_SENDER_ID',
    appId: 'APP_ID',
};
/**
 * Reads the config from the VITE_FIREBASE_* variables (.env.local), or VITE_FIREBASE_DEV_* for
 * the dev project. Empty or missing fields are taken from `fallback` (for example, the
 * firebaseConfig file read by the Vite plugin).
 */
export function firebaseConfigFromEnv(env, fallback = {}, appEnv = 'prod') {
    const prefix = appEnv === 'dev' ? 'VITE_FIREBASE_DEV_' : 'VITE_FIREBASE_';
    const config = {};
    for (const field of Object.keys(ENV_KEYS)) {
        const value = env[`${prefix}${ENV_KEYS[field]}`];
        config[field] = typeof value === 'string' && value ? value : fallback[field];
    }
    return config;
}
/** There is a real config: no required field is missing and no .env.example placeholder is left. */
export function isFirebaseConfigured(config) {
    return Boolean(config.apiKey && config.projectId && config.appId && !config.apiKey.startsWith('PEGA_AQUI'));
}
/**
 * Reason the dev project's config cannot be used, or null if it is fine. It must be complete and
 * belong to a project other than the real one: test data must never be written to the real one.
 */
export function devConfigProblem(dev, prod) {
    if (!isFirebaseConfigured(dev))
        return 'The dev Firebase config is incomplete.';
    if (dev.projectId === prod.projectId)
        return `The dev Firebase config belongs to the production project (${dev.projectId}).`;
    return null;
}
