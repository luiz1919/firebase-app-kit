import type { Plugin } from 'vite';
import type { FirebaseWebConfig } from './config.ts';
export interface FirebaseAppKitOptions {
    /**
     * File with the `const firebaseConfig = { ... }` block copied from the Firebase console,
     * relative to the app root. If it does not exist, the config comes only from the VITE_FIREBASE_* variables.
     */
    firebaseConfigFile?: string;
}
/** Reads the firebaseConfig object from a file copied from the Firebase console. Returns {} if it does not exist. */
export declare function readFirebaseConfigFile(path: string): Promise<FirebaseWebConfig>;
/**
 * Defines the app's global constants at build time (their types are in firebase-app-kit/globals):
 * - __APP_VERSION__: version from package.json.
 * - __APP_COMMIT__: git commit, or '' if none.
 * - __BUILD_TIME__: build date in ISO format; '' in development.
 * - __FIREBASE_CONFIG__: config read from `firebaseConfigFile`, or {}.
 */
export declare function firebaseAppKit(options?: FirebaseAppKitOptions): Plugin;
