// Production / dev ("Real" / "Pruebas") choice, kept per device. No Firebase dependency.
import { devConfigProblem, isFirebaseConfigured } from './config.js';
/** localStorage key of the chosen environment (one per origin, that is, per app). */
export const APP_ENV_STORAGE_KEY = 'firebase-app-kit:env';
function browserStorage() {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    }
    catch {
        // Storage blocked (private mode, sandboxed frame): always production.
        return null;
    }
}
/** Environment chosen on this device; 'prod' unless 'dev' was chosen. */
export function storedAppEnv(storage = browserStorage()) {
    try {
        return storage?.getItem(APP_ENV_STORAGE_KEY) === 'dev' ? 'dev' : 'prod';
    }
    catch {
        return 'prod';
    }
}
/**
 * The config to start Firebase with: the dev one only if it was chosen and is usable (complete
 * and of another project); otherwise production.
 */
export function chooseFirebaseConfig(prod, dev, stored) {
    const devAvailable = Boolean(dev) && isFirebaseConfigured(prod) && devConfigProblem(dev ?? {}, prod) === null;
    const current = devAvailable && stored === 'dev' ? 'dev' : 'prod';
    const config = current === 'dev' && dev ? dev : prod;
    return { config, environment: { current, devAvailable, projectId: config.projectId ?? '' } };
}
/** Saves the choice and reloads the app, which then starts with that project. */
export function switchAppEnv(env, storage = browserStorage()) {
    storage?.setItem(APP_ENV_STORAGE_KEY, env);
    window.location.reload();
}
/** Throws unless the app is using the dev project: guard for code that writes test data. */
export function assertDevEnvironment(environment) {
    if (environment.current !== 'dev')
        throw new Error('Los datos de prueba solo se pueden crear o borrar en Pruebas.');
}
