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
    /** Branch releases are made from. Defaults to 'main'. */
    releaseBranch?: string;
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
/** Runs git in `root` and returns its trimmed output; throws with git's own message if it fails. */
export declare function git(root: string, args: readonly string[]): string;
/** Git tag of a version: 1.2.3 -> v1.2.3. */
export declare const releaseTag: (version: string) => string;
export declare function tagExists(root: string, tag: string): boolean;
/**
 * Checks that a release can be made: on `branch`, nothing uncommitted, and up to date with its
 * remote branch. It fetches the remote (branches and tags), which also checks access to GitHub.
 * Returns the problem, or null if everything is ready.
 */
export declare function gitReleaseProblem(root: string, branch: string): string | null;
/**
 * Writes the version, commits package.json and package-lock.json as "chore(release): vX.Y.Z" and
 * creates the annotated tag, all locally. Returns how to undo it (if the build or the deploy fails).
 */
export declare function createRelease(root: string, version: string): () => void;
/** Pushes the release commit and its tag together (both or neither). */
export declare function pushRelease(root: string, branch: string, version: string): void;
/**
 * Reads the Firebase config the build will use: VITE_FIREBASE_* variables and, if the app
 * uses it, the file read by the firebaseAppKit() plugin.
 */
export declare function buildFirebaseConfig(root: string): Promise<FirebaseWebConfig>;
/** Reason not to publish with this config, or null if it is correct. */
export declare function firebaseConfigProblem(config: FirebaseWebConfig, projectId: string): string | null;
/**
 * Releases and publishes the app to Firebase Hosting. Stops at the first step that fails:
 * 1. Checks the Firebase CLI and git (release branch, nothing uncommitted, up to date with the remote),
 *    asks for the change type (unless --check or a type is given) and checks the new tag is free.
 * 2. npm ci, checks that the compiled Firebase config belongs to the project, lint and tests (if there is a test script).
 * 3. Creates the release commit (version in package.json and package-lock.json) and the vX.Y.Z tag locally,
 *    before building, so "Acerca de" (About) shows the published version and commit.
 * 4. Builds and publishes Hosting only. If the build or the publish fails, the commit, tag and version are undone.
 * 5. Pushes the release commit and the tag. A tag on GitHub therefore always means "this version is published".
 * --check runs steps 2 and the build only, without touching git or Firebase.
 */
export declare function deploy(options: DeployOptions): Promise<void>;
