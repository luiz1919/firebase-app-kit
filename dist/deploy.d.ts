import type { FirebaseWebConfig } from './config.ts';
export declare const VERSION_TYPES: readonly ["patch", "minor", "major"];
export type VersionType = (typeof VERSION_TYPES)[number];
export interface DeployOptions {
    /** Name shown in the banner. */
    appName: string;
    /** Firebase project to publish to. The compiled config must belong to this project. */
    projectId: string;
    /** App root (package.json, firebase.json, vite.config.ts). Defaults to the current directory. */
    root?: string | URL;
    /** Arguments of `npm run deploy -- ...`. Defaults to process.argv.slice(2). */
    args?: readonly string[];
}
export interface DeployArgs {
    checkOnly: boolean;
    /** Change type given; null if it must be asked (or with --check). */
    versionType: VersionType | null;
}
/** Parses the arguments; returns null if they are not valid. */
export declare function parseDeployArgs(args: readonly string[]): DeployArgs | null;
export declare const isSemver: (version: unknown) => version is string;
export declare function incrementVersion(current: string, type: VersionType): string;
/** Writes the version to package.json and package-lock.json (if present) and returns how to undo it. */
export declare function writeVersion(root: string, version: string): () => void;
/**
 * Reads the Firebase config the build will use: VITE_FIREBASE_* variables and, if the app
 * uses it, the file read by the firebaseAppKit() plugin.
 */
export declare function buildFirebaseConfig(root: string): Promise<FirebaseWebConfig>;
/** Reason not to publish with this config, or null if it is correct. */
export declare function firebaseConfigProblem(config: FirebaseWebConfig, projectId: string): string | null;
/**
 * Validates and publishes the app to Firebase Hosting. Stops at the first step that fails:
 * 1. Checks the Firebase CLI and asks for the change type (unless --check or a type is given).
 * 2. npm ci, checks that the compiled Firebase config belongs to the project, lint and tests (if there is a test script).
 * 3. Bumps the version before building, so "Acerca de" (About) shows the published one.
 * 4. Builds and publishes Hosting only. If the build or the publish fails, the version is left as it was.
 */
export declare function deploy(options: DeployOptions): Promise<void>;
