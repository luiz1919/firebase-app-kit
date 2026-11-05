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
  /** Nombre que aparece en la cabecera. */
  appName: string
  /** Proyecto de Firebase donde se publica. La configuracion compilada debe ser de este proyecto. */
  projectId: string
  /** Raiz de la app (package.json, firebase.json, vite.config.ts). Por defecto, el directorio actual. */
  root?: string | URL
  /** Argumentos de `npm run deploy -- ...`. Por defecto, process.argv.slice(2). */
  args?: readonly string[]
}

export interface DeployArgs {
  checkOnly: boolean
  /** Tipo de cambio indicado; null si hay que preguntarlo (o si es --check). */
  versionType: VersionType | null
}

const USAGE = 'Uso: npm run deploy [-- --check|--patch|--minor|--major]'

/** Interpreta los argumentos; devuelve null si no son validos. */
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

/** Escribe la version en package.json y package-lock.json (si existe) y devuelve como deshacerlo. */
export function writeVersion(root: string, version: string): () => void {
  const originals = ['package.json', 'package-lock.json']
    .map((name) => join(root, name))
    .filter((file) => existsSync(file))
    .map((file) => ({ file, content: readFileSync(file, 'utf8') }))
  // Se interpretan todos antes de escribir ninguno: si uno esta mal, no se toca nada.
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
 * Lee la configuracion Firebase que usara la compilacion: variables VITE_FIREBASE_* y, si la app
 * lo usa, el archivo que lee el plugin firebaseAppKit().
 */
export async function buildFirebaseConfig(root: string): Promise<FirebaseWebConfig> {
  // resolveConfig() rellena process.env (por ejemplo NODE_ENV=development). Se deja como estaba:
  // si no, `npm run build` lo heredaria y compilaria React en modo desarrollo.
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

/** Motivo por el que no se debe publicar con esta configuracion, o null si es correcta. */
export function firebaseConfigProblem(config: FirebaseWebConfig, projectId: string): string | null {
  if (!isFirebaseConfigured(config)) return 'La configuracion Firebase de produccion esta incompleta.'
  if (config.projectId !== projectId) {
    return `La configuracion Firebase de produccion es del proyecto "${config.projectId}", no de ${projectId}.`
  }
  return null
}

function askVersionType(current: string): Promise<VersionType> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    console.log('\n🔄 ¿Que tipo de cambio es este deploy?\n')
    console.log(`  1. PATCH (${incrementVersion(current, 'patch')}) - Bugs, cambios UI menores, optimizaciones`)
    console.log(`  2. MINOR (${incrementVersion(current, 'minor')}) - Nuevas funcionalidades, nuevas pantallas`)
    console.log(`  3. MAJOR (${incrementVersion(current, 'major')}) - Cambios breaking, migracion de datos\n`)
    rl.question('Elige (1-3): ', (answer) => {
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
 * Valida y publica la app en Firebase Hosting. Se detiene en el primer paso que falle:
 * 1. Comprueba Firebase CLI y pregunta el tipo de cambio (salvo con --check o si se indica).
 * 2. npm ci, comprueba que la configuracion Firebase compilada es del proyecto, lint y tests (si hay script test).
 * 3. Sube la version antes de compilar, para que "Acerca de" muestre la que se publica.
 * 4. Compila y publica solo Hosting. Si falla la compilacion o la publicacion, deja la version como estaba.
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

  // Si algo falla despues de subir la version, se deja como estaba: no se ha publicado nada.
  let restoreVersion: (() => void) | null = null

  function fail(message: string, code = 1): never {
    if (restoreVersion) {
      restoreVersion()
      console.error('↩️  Version restaurada: no se ha publicado nada.')
    }
    console.error(`❌ ${message}`)
    process.exit(code)
  }

  function run(command: string, commandArgs: string[]) {
    console.log(`\n$ ${command} ${commandArgs.join(' ')}`)
    const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit' })
    if (result.error) {
      fail(`No se puede ejecutar ${command}. ${command === 'firebase' ? 'Instala Firebase CLI: npm install -g firebase-tools' : 'Comprueba que Node y npm estan instalados.'}`)
    }
    if (result.status !== 0) fail(`Error al ejecutar: ${command} ${commandArgs.join(' ')}`, result.status ?? 1)
  }

  const readPackage = () => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    version?: unknown
    scripts?: Record<string, string>
  }

  banner(options.appName)

  let newVersion = ''
  if (!checkOnly) {
    console.log('\n🔐 Verificando Firebase CLI...')
    run('firebase', ['--version'])

    const currentVersion = readPackage().version
    if (!isSemver(currentVersion)) fail(`La version de package.json ("${currentVersion}") no tiene el formato MAJOR.MINOR.PATCH.`)
    // Se pregunta al principio para no tener que esperar a la compilacion.
    if (!forcedType && !process.stdin.isTTY) {
      fail('Sin terminal interactiva: indica el tipo de cambio con -- --patch, -- --minor o -- --major.', 2)
    }
    const versionType = forcedType ?? (await askVersionType(currentVersion))
    newVersion = incrementVersion(currentVersion, versionType)
    console.log(`\n📦 Version actual: ${currentVersion}`)
    console.log(`📦 Nueva version:  ${newVersion} (${versionType.toUpperCase()})`)
  }

  console.log('\n📥 Instalando dependencias...')
  run('npm', ['ci'])

  let firebaseConfig: FirebaseWebConfig
  try {
    firebaseConfig = await buildFirebaseConfig(root)
  } catch (error) {
    fail(`No se ha podido leer la configuracion de Vite: ${error instanceof Error ? error.message : String(error)}`)
  }
  const problem = firebaseConfigProblem(firebaseConfig, projectId)
  if (problem) fail(`${problem} No se publicara nada.`)

  const hasTests = Boolean(readPackage().scripts?.test)
  console.log(hasTests ? '\n🔍 Ejecutando lint y pruebas...' : '\n🔍 Ejecutando lint...')
  run('npm', ['run', 'lint'])
  if (hasTests) run('npm', ['test'])

  // La version se sube antes de compilar para que "Acerca de" muestre la que se publica.
  if (!checkOnly) restoreVersion = writeVersion(root, newVersion)

  console.log('\n🔨 Compilando...')
  run('npm', ['run', 'build'])

  if (checkOnly) {
    console.log('\n✅ Validacion correcta. No se ha publicado nada.\n')
    return
  }

  console.log('\n🚀 Desplegando en Firebase...')
  run('firebase', ['deploy', '--config', 'firebase.json', '--only', 'hosting', '--project', projectId, '--non-interactive'])
  restoreVersion = null
  console.log('\n✨ ¡Publicado correctamente!')
  console.log(`📱 URL: https://${projectId}.web.app`)
  console.log(`📦 Version: ${newVersion}`)
  console.log('📝 Haz commit de package.json y package-lock.json para guardar la nueva version.\n')
}
