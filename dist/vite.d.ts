import type { Plugin } from 'vite';
import type { FirebaseWebConfig } from './config.ts';
export interface FirebaseAppKitOptions {
    /**
     * Archivo con el bloque `const firebaseConfig = { ... }` copiado de la consola de Firebase,
     * relativo a la raiz de la app. Si no existe, la configuracion sale solo de las variables VITE_FIREBASE_*.
     */
    firebaseConfigFile?: string;
}
/** Lee el objeto firebaseConfig de un archivo copiado de la consola de Firebase. Si no existe, devuelve {}. */
export declare function readFirebaseConfigFile(path: string): Promise<FirebaseWebConfig>;
/**
 * Define las constantes globales de la app al compilar (sus tipos estan en firebase-app-kit/globals):
 * - __APP_VERSION__: version de package.json.
 * - __APP_COMMIT__: commit de git, o '' si no hay.
 * - __BUILD_TIME__: fecha de compilacion en ISO; '' en desarrollo.
 * - __FIREBASE_CONFIG__: configuracion leida de `firebaseConfigFile`, o {}.
 */
export declare function firebaseAppKit(options?: FirebaseAppKitOptions): Plugin;
