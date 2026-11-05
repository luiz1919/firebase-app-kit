import type { FirebaseWebConfig } from './config.ts';
export declare const VERSION_TYPES: readonly ["patch", "minor", "major"];
export type VersionType = (typeof VERSION_TYPES)[number];
export interface DeployOptions {
    /** Nombre que aparece en la cabecera. */
    appName: string;
    /** Proyecto de Firebase donde se publica. La configuracion compilada debe ser de este proyecto. */
    projectId: string;
    /** Raiz de la app (package.json, firebase.json, vite.config.ts). Por defecto, el directorio actual. */
    root?: string | URL;
    /** Argumentos de `npm run deploy -- ...`. Por defecto, process.argv.slice(2). */
    args?: readonly string[];
}
export interface DeployArgs {
    checkOnly: boolean;
    /** Tipo de cambio indicado; null si hay que preguntarlo (o si es --check). */
    versionType: VersionType | null;
}
/** Interpreta los argumentos; devuelve null si no son validos. */
export declare function parseDeployArgs(args: readonly string[]): DeployArgs | null;
export declare const isSemver: (version: unknown) => version is string;
export declare function incrementVersion(current: string, type: VersionType): string;
/** Escribe la version en package.json y package-lock.json (si existe) y devuelve como deshacerlo. */
export declare function writeVersion(root: string, version: string): () => void;
/**
 * Lee la configuracion Firebase que usara la compilacion: variables VITE_FIREBASE_* y, si la app
 * lo usa, el archivo que lee el plugin firebaseAppKit().
 */
export declare function buildFirebaseConfig(root: string): Promise<FirebaseWebConfig>;
/** Motivo por el que no se debe publicar con esta configuracion, o null si es correcta. */
export declare function firebaseConfigProblem(config: FirebaseWebConfig, projectId: string): string | null;
/**
 * Valida y publica la app en Firebase Hosting. Se detiene en el primer paso que falle:
 * 1. Comprueba Firebase CLI y pregunta el tipo de cambio (salvo con --check o si se indica).
 * 2. npm ci, comprueba que la configuracion Firebase compilada es del proyecto, lint y tests (si hay script test).
 * 3. Sube la version antes de compilar, para que "Acerca de" muestre la que se publica.
 * 4. Compila y publica solo Hosting. Si falla la compilacion o la publicacion, deja la version como estaba.
 */
export declare function deploy(options: DeployOptions): Promise<void>;
