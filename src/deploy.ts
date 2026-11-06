import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { firebaseConfigFromEnv, isFirebaseConfigured } from './config.ts'
import type { FirebaseWebConfig } from './config.ts'

export const VERSION_TYPES = ['patch', 'minor', 'major'] as const
export type VersionType = (typeof VERSION_TYPES)[number]

export interface DeployOptions {
  /** Name shown in the banner. */
  appName: string
  /** Firebase project to publish to. The compiled config must belong to this project. */
  projectId: string
  /** App root (package.json, firebase.json, vite.config.ts). Defaults to the current directory. */
  root?: string | URL
  /** Arguments of `npm run deploy -- ...`. Defaults to process.argv.slice(2). */
  args?: readonly string[]
}

export interface DeployArgs {
  checkOnly: boolean
  /** Change type given; null if it must be asked (or with --check). */
  versionType: VersionType | null
}

const USAGE = 'Usage: npm run deploy [-- --check|--patch|--minor|--major]'

/** Parses the arguments; returns null if they are not valid. */
export function parseDeployArgs(args: readonly string[]): DeployArgs | null {
  if (args.length === 0) return { checkOnly: false, versionType: null }
  if (args.length > 1) return null
  if (args[0] === '--check') return { checkOnly: true, versionType: null }
  const versionType = VERSION_TYPES.find((type) => args[0] === `--${type}`)
  return versionType ? { checkOnly: false, versionType } : null
}

export const isSemver = (version: unknown): version is string =>
  typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version)

export function incrementVersion(current: string, type: VersionType): string {
  const [major, minor, patch] = current.split('.').map(Number)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

/** Writes the version to package.json and package-lock.json (if present) and returns how to undo it. */
export function writeVersion(root: string, version: string): () => void {
  const originals = ['package.json', 'package-lock.json']
    .map((name) => join(root, name))
    .filter((file) => existsSync(file))
    .map((file) => ({ file, content: readFileSync(file, 'utf8') }))
  // All are parsed before writing any: if one is broken, nothing is touched.
  const updated = originals.map(({ file, content }) => {
    const data = JSON.parse(content)
    data.version = version
    if (data.packages?.['']) data.packages[''].version = version
    return { file, content: `${JSON.stringify(data, null, 2)}\n` }
  })
  for (const { file, content } of updated) writeFileSync(file, content)
  return () => {
    for (const { file, content } of originals) writeFileSync(file, content)
  }
}

/**
 * Reads the Firebase config the build will use: VITE_FIREBASE_* variables and, if the app
 * uses it, the file read by the firebaseAppKit() plugin.
 */
export async function buildFirebaseConfig(root: string): Promise<FirebaseWebConfig> {
  // resolveConfig() fills in process.env (for example NODE_ENV=development). It is restored:
  // otherwise `npm run build` would inherit it and build React in development mode.
  const env = { ...process.env }
  try {
    const { resolveConfig } = await import('vite')
    const resolved = await resolveConfig({ root, logLevel: 'silent' }, 'build', 'production', 'production')
    const fileConfig = JSON.parse(String(resolved.define?.__FIREBASE_CONFIG__ ?? '{}')) as FirebaseWebConfig
    return firebaseConfigFromEnv(resolved.env, fileConfig)
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key]
    Object.assign(process.env, env)
  }
}

/** Reason not to publish with this config, or null if it is correct. */
export function firebaseConfigProblem(config: FirebaseWebConfig, projectId: string): string | null {
  if (!isFirebaseConfigured(config)) return 'The production Firebase config is incomplete.'
  if (config.projectId !== projectId) {
    return `The production Firebase config belongs to project "${config.projectId}", not ${projectId}.`
  }
  return null
}

function askVersionType(current: string): Promise<VersionType> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    console.log('\n🔄 What kind of change is this deploy?\n')
    console.log(`  1. PATCH (${incrementVersion(current, 'patch')}) - Bug fixes, minor UI changes, optimizations`)
    console.log(`  2. MINOR (${incrementVersion(current, 'minor')}) - New features, new screens`)
    console.log(`  3. MAJOR (${incrementVersion(current, 'major')}) - Breaking changes, data migration\n`)
    rl.question('Choose (1-3): ', (answer) => {
      rl.close()
      const choices: Record<string, VersionType> = { 1: 'patch', 2: 'minor', 3: 'major' }
      resolve(choices[answer.trim()] ?? 'patch')
    })
  })
}

function banner(appName: string) {
  const width = 44
  const title = `🚀 ${appName} Deploy`
  const left = Math.max(1, Math.floor((width - title.length) / 2))
  const right = Math.max(1, width - title.length - left)
  console.log(`╔${'═'.repeat(width)}╗`)
  console.log(`║${' '.repeat(left)}${title}${' '.repeat(right)}║`)
  console.log(`╚${'═'.repeat(width)}╝`)
}

/**
 * Validates and publishes the app to Firebase Hosting. Stops at the first step that fails:
 * 1. Checks the Firebase CLI and asks for the change type (unless --check or a type is given).
 * 2. npm ci, checks that the compiled Firebase config belongs to the project, lint and tests (if there is a test script).
 * 3. Bumps the version before building, so "Acerca de" (About) shows the published one.
 * 4. Builds and publishes Hosting only. If the build or the publish fails, the version is left as it was.
 */
export async function deploy(options: DeployOptions): Promise<void> {
  const root = options.root instanceof URL ? fileURLToPath(options.root) : (options.root ?? process.cwd())
  const parsed = parseDeployArgs(options.args ?? process.argv.slice(2))
  if (!parsed) {
    console.error(USAGE)
    process.exit(2)
  }
  const { checkOnly, versionType: forcedType } = parsed
  const { projectId } = options
  process.chdir(root)

  // If something fails after bumping the version, it is restored: nothing was published.
  let restoreVersion: (() => void) | null = null

  function fail(message: string, code = 1): never {
    if (restoreVersion) {
      restoreVersion()
      console.error('↩️  Version restored: nothing was published.')
    }
    console.error(`❌ ${message}`)
    process.exit(code)
  }

  function run(command: string, commandArgs: string[]) {
    console.log(`\n$ ${command} ${commandArgs.join(' ')}`)
    const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit' })
    if (result.error) {
      fail(`Cannot run ${command}. ${command === 'firebase' ? 'Install the Firebase CLI: npm install -g firebase-tools' : 'Check that Node and npm are installed.'}`)
    }
    if (result.status !== 0) fail(`Command failed: ${command} ${commandArgs.join(' ')}`, result.status ?? 1)
  }

  const readPackage = () => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    version?: unknown
    scripts?: Record<string, string>
  }

  banner(options.appName)

  let newVersion = ''
  if (!checkOnly) {
    console.log('\n🔐 Checking Firebase CLI...')
    run('firebase', ['--version'])

    const currentVersion = readPackage().version
    if (!isSemver(currentVersion)) fail(`The package.json version ("${currentVersion}") is not in MAJOR.MINOR.PATCH format.`)
    // Asked at the start so there is no need to wait for the build.
    if (!forcedType && !process.stdin.isTTY) {
      fail('No interactive terminal: pass the change type with -- --patch, -- --minor or -- --major.', 2)
    }
    const versionType = forcedType ?? (await askVersionType(currentVersion))
    newVersion = incrementVersion(currentVersion, versionType)
    console.log(`\n📦 Current version: ${currentVersion}`)
    console.log(`📦 New version:     ${newVersion} (${versionType.toUpperCase()})`)
  }

  console.log('\n📥 Installing dependencies...')
  run('npm', ['ci'])

  let firebaseConfig: FirebaseWebConfig
  try {
    firebaseConfig = await buildFirebaseConfig(root)
  } catch (error) {
    fail(`Could not read the Vite config: ${error instanceof Error ? error.message : String(error)}`)
  }
  const problem = firebaseConfigProblem(firebaseConfig, projectId)
  if (problem) fail(`${problem} Nothing will be published.`)

  const hasTests = Boolean(readPackage().scripts?.test)
  console.log(hasTests ? '\n🔍 Running lint and tests...' : '\n🔍 Running lint...')
  run('npm', ['run', 'lint'])
  if (hasTests) run('npm', ['test'])

  // The version is bumped before building so "Acerca de" (About) shows the published one.
  if (!checkOnly) restoreVersion = writeVersion(root, newVersion)

  console.log('\n🔨 Building...')
  run('npm', ['run', 'build'])

  if (checkOnly) {
    console.log('\n✅ Validation passed. Nothing was published.\n')
    return
  }

  console.log('\n🚀 Deploying to Firebase...')
  run('firebase', ['deploy', '--config', 'firebase.json', '--only', 'hosting', '--project', projectId, '--non-interactive'])
  restoreVersion = null
  console.log('\n✨ Published successfully!')
  console.log(`📱 URL: https://${projectId}.web.app`)
  console.log(`📦 Version: ${newVersion}`)
  console.log('📝 Commit package.json and package-lock.json to keep the new version.\n')
}
