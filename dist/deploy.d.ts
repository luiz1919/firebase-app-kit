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
    /**
     * Changelog file, relative to `root` (e.g. 'Changelog.md'). If given, each release adds its
     * version to it in a "docs(changelog): vX.Y.Z" commit, before the release commit. See `addChangelogVersion`.
     */
    changelog?: string;
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
/** New changelog content to commit with a release; `file` is relative to the app root. */
export interface ChangelogChange {
    file: string;
    content: string;
}
/**
 * Locally, and in this order: commits the changelog (if given) as "docs(changelog): vX.Y.Z", writes
 * the version and commits package.json and package-lock.json as "chore(release): vX.Y.Z", and
 * creates the annotated tag. Returns how to undo all of it (if the build or the deploy fails).
 */
export declare function createRelease(root: string, version: string, changelog?: ChangelogChange): () => void;
/** Pushes the release commits and the tag together (all or nothing). */
export declare function pushRelease(root: string, branch: string, version: string): void;
/** Latest vX.Y.Z tag reachable from HEAD, or null if there is none yet. */
export declare function lastReleaseTag(root: string): string | null;
/** Subjects of the commits after `tag` (all of them if null), oldest first, without merges. */
export declare function commitSubjectsSince(root: string, tag: string | null): string[];
/**
 * Changelog notes from commit subjects: without the release commits, without conventional
 * prefixes ("feat(ui): add x" -> "Add x"), capitalized and without repeats.
 */
export declare function releaseNotes(subjects: readonly string[]): string[];
/** Web address of a GitHub repo from its git remote (https or ssh), or null if it is not GitHub. */
export declare function githubRepoUrl(remoteUrl: string): string | null;
/** Entries written by hand under "## Unreleased" (without blank edges or the placeholder), or null if there are none. */
export declare function unreleasedNotes(content: string | null): string[] | null;
export interface ChangelogRelease {
    version: string;
    /** Release date, YYYY-MM-DD. */
    date: string;
    /** Notes from the commits (`releaseNotes`): used if nothing was written under "Unreleased". */
    notes: readonly string[];
    /** Previous release tag, for the compare link. */
    previousTag: string | null;
    /** GitHub repo address (`githubRepoUrl`); without it the version has no link. */
    repoUrl: string | null;
}
/**
 * Changelog content with the new version added, newest first ("Keep a Changelog" style):
 * - The version lists the entries written under "## Unreleased" if there are any, otherwise the
 *   commit notes. "Unreleased" is left empty ("_Nothing yet._") for the next version.
 * - Without an "Unreleased" section, the version goes before the first "## " section.
 * - With a GitHub repo, the heading is a link to the changes since the previous tag.
 * A missing file (null) becomes a new changelog.
 */
export declare function addChangelogVersion(content: string | null, release: ChangelogRelease): string;
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
 * 3. Locally, before building (so "Acerca de" (About) shows the published version and commit): with the
 *    `changelog` option, adds the version to the changelog and commits it; then creates the release commit
 *    (version in package.json and package-lock.json) and the vX.Y.Z tag.
 * 4. Builds and publishes Hosting only. If the build or the publish fails, the commits, tag, version and
 *    changelog are undone.
 * 5. Pushes the commits and the tag. A tag on GitHub therefore always means "this version is published".
 * --check runs steps 2 and the build only (and shows what the changelog would get), without touching git or Firebase.
 */
export declare function deploy(options: DeployOptions): Promise<void>;
