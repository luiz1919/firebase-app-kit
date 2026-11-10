import type { AppEnv, FirebaseWebConfig } from './config.ts';
/** localStorage key of the chosen environment (one per origin, that is, per app). */
export declare const APP_ENV_STORAGE_KEY = "firebase-app-kit:env";
/** The Firebase project the app is using, for the "Pruebas" banner and "Acerca de" (About). */
export interface AppEnvironment {
    current: AppEnv;
    /** The build has a usable dev config (so the app can switch to "Pruebas"). */
    devAvailable: boolean;
    /** Project in use, e.g. "supermerk2-dev". */
    projectId: string;
}
interface KeyValueStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
/** Environment chosen on this device; 'prod' unless 'dev' was chosen. */
export declare function storedAppEnv(storage?: KeyValueStorage | null): AppEnv;
/**
 * The config to start Firebase with: the dev one only if it was chosen and is usable (complete
 * and of another project); otherwise production.
 */
export declare function chooseFirebaseConfig(prod: FirebaseWebConfig, dev: FirebaseWebConfig | undefined, stored: AppEnv): {
    config: FirebaseWebConfig;
    environment: AppEnvironment;
};
/** Saves the choice and reloads the app, which then starts with that project. */
export declare function switchAppEnv(env: AppEnv, storage?: KeyValueStorage | null): void;
/** Throws unless the app is using the dev project: guard for code that writes test data. */
export declare function assertDevEnvironment(environment: AppEnvironment): void;
export {};
