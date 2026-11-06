import type { Plugin } from 'vite';
import type { FirebaseWebConfig } from './config.ts';
export interface FirebaseAppKitOptions {
    /**
     * File with the `const firebaseConfig = { ... }` block copied from the Firebase console,
     * relative to the app root. If it does not exist, the config comes only from the VITE_FIREBASE_* variables.
     */
    firebaseConfigFile?: string;
    /** Generates /sw.js at build time (the shared offline strategy). The app must not have public/sw.js. */
    serviceWorker?: ServiceWorkerOptions;
}
export interface ServiceWorkerOptions {
    /**
     * Cache Storage name, e.g. 'my-app-v1'. Every other cache of the origin is deleted when the
     * service worker activates, so changing it discards everything stored by older versions.
     */
    cacheName: string;
    /** Files outside /assets/ to keep offline, e.g. ['/manifest.webmanifest', '/icons/icon-192.png']. */
    staticFiles: string[];
}
/**
 * Source of /sw.js: the shared template with the app's cache name and static files, and the
 * /assets/ files of this build (`buildAssets`), so files loaded later with import() are kept offline.
 */
export declare function serviceWorkerSource({ cacheName, staticFiles }: ServiceWorkerOptions, buildAssets?: readonly string[]): string;
/** Reads the firebaseConfig object from a file copied from the Firebase console. Returns {} if it does not exist. */
export declare function readFirebaseConfigFile(path: string): Promise<FirebaseWebConfig>;
/**
 * Defines the app's global constants at build time (their types are in firebase-app-kit/globals):
 * - __APP_VERSION__: version from package.json.
 * - __APP_COMMIT__: git commit, or '' if none.
 * - __BUILD_TIME__: build date in ISO format; '' in development.
 * - __FIREBASE_CONFIG__: config read from `firebaseConfigFile`, or {}.
 * With `serviceWorker`, it also emits /sw.js in the build (see serviceWorkerSource).
 */
export declare function firebaseAppKit(options?: FirebaseAppKitOptions): Plugin;
