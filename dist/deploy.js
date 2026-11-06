import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { firebaseConfigFromEnv, isFirebaseConfigured } from "./config.js";
export const VERSION_TYPES = ['patch', 'minor', 'major'];
const USAGE = 'Usage: npm run deploy [-- --check|--patch|--minor|--major]';
/** Parses the arguments; returns null if they are not valid. */
export function parseDeployArgs(args) {
    if (args.length === 0)
        return { checkOnly: false, versionType: null };
    if (args.length > 1)
        return null;
    if (args[0] === '--check')
        return { checkOnly: true, versionType: null };
    const versionType = VERSION_TYPES.find((type) => args[0] === `--${type}`);
    return versionType ? { checkOnly: false, versionType } : null;
}
export const isSemver = (version) => typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version);
export function incrementVersion(current, type) {
    const [major, minor, patch] = current.split('.').map(Number);
    if (type === 'major')
        return `${major + 1}.0.0`;
    if (type === 'minor')
        return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
}
/** Writes the version to package.json and package-lock.json (if present) and returns how to undo it. */
export function writeVersion(root, version) {
    const originals = ['package.json', 'package-lock.json']
        .map((name) => join(root, name))
        .filter((file) => existsSync(file))
        .map((file) => ({ file, content: readFileSync(file, 'utf8') }));
    // All are parsed before writing any: if one is broken, nothing is touched.
    const updated = originals.map(({ file, content }) => {
        const data = JSON.parse(content);
        data.version = version;
        if (data.packages?.[''])
            data.packages[''].version = version;
        return { file, content: `${JSON.stringify(data, null, 2)}\n` };
    });
    for (const { file, content } of updated)
        writeFileSync(file, content);
    return () => {
        for (const { file, content } of originals)
            writeFileSync(file, content);
    };
}
/** Runs git in `root` and returns its trimmed output; throws with git's own message if it fails. */
export function git(root, args) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    if (result.error)
        throw new Error('Cannot run git. Check that git is installed.');
    if (result.status !== 0)
        throw new Error((result.stderr || result.stdout).trim() || `git ${args.join(' ')} failed`);
    return result.stdout.trim();
}
/** Git tag of a version: 1.2.3 -> v1.2.3. */
export const releaseTag = (version) => `v${version}`;
export function tagExists(root, tag) {
    try {
        git(root, ['rev-parse', '-q', '--verify', `refs/tags/${tag}`]);
        return true;
    }
    catch {
        return false;
    }
}
/** Remote of the release branch (usually "origin"). */
const remoteOf = (root, branch) => git(root, ['config', '--get', `branch.${branch}.remote`]);
/**
 * Checks that a release can be made: on `branch`, nothing uncommitted, and up to date with its
 * remote branch. It fetches the remote (branches and tags), which also checks access to GitHub.
 * Returns the problem, or null if everything is ready.
 */
export function gitReleaseProblem(root, branch) {
    try {
        git(root, ['rev-parse', '--is-inside-work-tree']);
    }
    catch {
        return 'This folder is not a git repository.';
    }
    const current = git(root, ['branch', '--show-current']);
    if (current !== branch)
        return `Releases are made from the "${branch}" branch, and you are on "${current || 'a detached HEAD'}".`;
    if (git(root, ['status', '--porcelain']))
        return 'There are uncommitted changes: commit (or discard) them before deploying.';
    let remote;
    let upstream;
    try {
        remote = remoteOf(root, branch);
        upstream = git(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
    }
    catch {
        return `The "${branch}" branch is not linked to a remote branch: run git push -u origin ${branch} once.`;
    }
    try {
        git(root, ['fetch', '--quiet', '--tags', remote]);
    }
    catch (error) {
        return `Cannot reach the git remote "${remote}": ${error instanceof Error ? error.message : String(error)}`;
    }
    const behind = Number(git(root, ['rev-list', '--count', `HEAD..${upstream}`]));
    if (behind > 0)
        return `"${branch}" is ${behind} commit(s) behind ${upstream}: run git pull first.`;
    return null;
}
/**
 * Writes the version, commits package.json and package-lock.json as "chore(release): vX.Y.Z" and
 * creates the annotated tag, all locally. Returns how to undo it (if the build or the deploy fails).
 */
export function createRelease(root, version) {
    const tag = releaseTag(version);
    const files = ['package.json', 'package-lock.json'].filter((name) => existsSync(join(root, name)));
    const undoSteps = [writeVersion(root, version)];
    const undo = () => {
        for (const step of [...undoSteps].reverse()) {
            try {
                step();
            }
            catch (error) {
                console.error(`⚠️  Could not undo a release step: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    };
    try {
        git(root, ['add', '--', ...files]);
        undoSteps.push(() => git(root, ['reset', '-q', '--', ...files]));
        git(root, ['commit', '-q', '-m', `chore(release): ${tag}`]);
        undoSteps.push(() => git(root, ['reset', '-q', '--soft', 'HEAD~1']));
        git(root, ['tag', '-a', tag, '-m', tag]);
        undoSteps.push(() => git(root, ['tag', '-d', tag]));
    }
    catch (error) {
        undo();
        throw error;
    }
    return undo;
}
/** Pushes the release commit and its tag together (both or neither). */
export function pushRelease(root, branch, version) {
    git(root, ['push', '--quiet', '--atomic', remoteOf(root, branch), `HEAD:refs/heads/${branch}`, `refs/tags/${releaseTag(version)}`]);
}
/**
 * Reads the Firebase config the build will use: VITE_FIREBASE_* variables and, if the app
 * uses it, the file read by the firebaseAppKit() plugin.
 */
export async function buildFirebaseConfig(root) {
    // resolveConfig() fills in process.env (for example NODE_ENV=development). It is restored:
    // otherwise `npm run build` would inherit it and build React in development mode.
    const env = { ...process.env };
    try {
        const { resolveConfig } = await import('vite');
        const resolved = await resolveConfig({ root, logLevel: 'silent' }, 'build', 'production', 'production');
        const fileConfig = JSON.parse(String(resolved.define?.__FIREBASE_CONFIG__ ?? '{}'));
        return firebaseConfigFromEnv(resolved.env, fileConfig);
    }
    finally {
        for (const key of Object.keys(process.env))
            if (!(key in env))
                delete process.env[key];
        Object.assign(process.env, env);
    }
}
/** Reason not to publish with this config, or null if it is correct. */
export function firebaseConfigProblem(config, projectId) {
    if (!isFirebaseConfigured(config))
        return 'The production Firebase config is incomplete.';
    if (config.projectId !== projectId) {
        return `The production Firebase config belongs to project "${config.projectId}", not ${projectId}.`;
    }
    return null;
}
function askVersionType(current) {
    return new Promise((resolve) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        console.log('\n🔄 What kind of change is this deploy?\n');
        console.log(`  1. PATCH (${incrementVersion(current, 'patch')}) - Bug fixes, minor UI changes, optimizations`);
        console.log(`  2. MINOR (${incrementVersion(current, 'minor')}) - New features, new screens`);
        console.log(`  3. MAJOR (${incrementVersion(current, 'major')}) - Breaking changes, data migration\n`);
        rl.question('Choose (1-3): ', (answer) => {
            rl.close();
            const choices = { 1: 'patch', 2: 'minor', 3: 'major' };
            resolve(choices[answer.trim()] ?? 'patch');
        });
    });
}
function banner(appName) {
    const width = 44;
    const title = `🚀 ${appName} Deploy`;
    const left = Math.max(1, Math.floor((width - title.length) / 2));
    const right = Math.max(1, width - title.length - left);
    console.log(`╔${'═'.repeat(width)}╗`);
    console.log(`║${' '.repeat(left)}${title}${' '.repeat(right)}║`);
    console.log(`╚${'═'.repeat(width)}╝`);
}
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
export async function deploy(options) {
    const root = options.root instanceof URL ? fileURLToPath(options.root) : (options.root ?? process.cwd());
    const parsed = parseDeployArgs(options.args ?? process.argv.slice(2));
    if (!parsed) {
        console.error(USAGE);
        process.exit(2);
    }
    const { checkOnly, versionType: forcedType } = parsed;
    const { projectId } = options;
    const branch = options.releaseBranch ?? 'main';
    process.chdir(root);
    // If something fails after creating the release, it is undone: nothing was published or pushed.
    let undoRelease = null;
    function fail(message, code = 1) {
        if (undoRelease) {
            undoRelease();
            console.error('↩️  Release undone (version, commit and tag): nothing was published or pushed.');
        }
        console.error(`❌ ${message}`);
        process.exit(code);
    }
    function run(command, commandArgs) {
        console.log(`\n$ ${command} ${commandArgs.join(' ')}`);
        const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit' });
        if (result.error) {
            fail(`Cannot run ${command}. ${command === 'firebase' ? 'Install the Firebase CLI: npm install -g firebase-tools' : 'Check that Node and npm are installed.'}`);
        }
        if (result.status !== 0)
            fail(`Command failed: ${command} ${commandArgs.join(' ')}`, result.status ?? 1);
    }
    const readPackage = () => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    banner(options.appName);
    let newVersion = '';
    if (!checkOnly) {
        console.log('\n🔐 Checking Firebase CLI...');
        run('firebase', ['--version']);
        console.log(`\n🌿 Checking git (branch ${branch}, uncommitted changes, remote)...`);
        const gitProblem = gitReleaseProblem(root, branch);
        if (gitProblem)
            fail(gitProblem);
        const currentVersion = readPackage().version;
        if (!isSemver(currentVersion))
            fail(`The package.json version ("${currentVersion}") is not in MAJOR.MINOR.PATCH format.`);
        // Asked at the start so there is no need to wait for the build.
        if (!forcedType && !process.stdin.isTTY) {
            fail('No interactive terminal: pass the change type with -- --patch, -- --minor or -- --major.', 2);
        }
        const versionType = forcedType ?? (await askVersionType(currentVersion));
        newVersion = incrementVersion(currentVersion, versionType);
        if (tagExists(root, releaseTag(newVersion))) {
            fail(`The tag ${releaseTag(newVersion)} already exists: the package.json version (${currentVersion}) is behind the latest release.`);
        }
        console.log(`\n📦 Current version: ${currentVersion}`);
        console.log(`📦 New version:     ${newVersion} (${versionType.toUpperCase()})`);
    }
    console.log('\n📥 Installing dependencies...');
    run('npm', ['ci']);
    let firebaseConfig;
    try {
        firebaseConfig = await buildFirebaseConfig(root);
    }
    catch (error) {
        fail(`Could not read the Vite config: ${error instanceof Error ? error.message : String(error)}`);
    }
    const problem = firebaseConfigProblem(firebaseConfig, projectId);
    if (problem)
        fail(`${problem} Nothing will be published.`);
    const hasTests = Boolean(readPackage().scripts?.test);
    console.log(hasTests ? '\n🔍 Running lint and tests...' : '\n🔍 Running lint...');
    run('npm', ['run', 'lint']);
    if (hasTests)
        run('npm', ['test']);
    // The release commit is made before building so "Acerca de" (About) shows the published version and commit.
    if (!checkOnly) {
        console.log(`\n🏷️  Creating the release commit and tag ${releaseTag(newVersion)}...`);
        try {
            undoRelease = createRelease(root, newVersion);
        }
        catch (error) {
            fail(`Could not create the release commit: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    console.log('\n🔨 Building...');
    run('npm', ['run', 'build']);
    if (checkOnly) {
        console.log('\n✅ Validation passed. Nothing was published.\n');
        return;
    }
    console.log('\n🚀 Deploying to Firebase...');
    run('firebase', ['deploy', '--config', 'firebase.json', '--only', 'hosting', '--project', projectId, '--non-interactive']);
    undoRelease = null;
    console.log('\n✨ Published successfully!');
    console.log(`📱 URL: https://${projectId}.web.app`);
    console.log(`📦 Version: ${newVersion}`);
    const tag = releaseTag(newVersion);
    console.log(`\n⬆️  Pushing the release commit and tag ${tag}...`);
    try {
        pushRelease(root, branch, newVersion);
    }
    catch (error) {
        // Already published: the release stays, it only needs to be pushed.
        console.error(`\n⚠️  Published, but the push failed: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`   Push it when you can: git push --atomic ${remoteOf(root, branch)} ${branch} ${tag}\n`);
        process.exit(1);
    }
    console.log(`✅ Release ${tag} pushed.\n`);
}
