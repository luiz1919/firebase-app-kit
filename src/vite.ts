import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import type { Node as TsNode } from 'typescript'
import type { Plugin } from 'vite'
import type { FirebaseWebConfig } from './config.ts'

export interface FirebaseAppKitOptions {
  /**
   * File with the `const firebaseConfig = { ... }` block copied from the Firebase console,
   * relative to the app root. If it does not exist, the config comes only from the VITE_FIREBASE_* variables.
   */
  firebaseConfigFile?: string
}

const CONFIG_FIELDS = new Set(['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'])

/** Reads the firebaseConfig object from a file copied from the Firebase console. Returns {} if it does not exist. */
export async function readFirebaseConfigFile(path: string): Promise<FirebaseWebConfig> {
  if (!existsSync(path)) return {}
  // TypeScript is only loaded if the app uses the file: it reads the object without running the code.
  const { default: ts } = await import('typescript')
  const source = ts.createSourceFile('firebaseConfig.ts', readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
  const config: Record<string, string> = {}
  function visit(node: TsNode) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'firebaseConfig'
      && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      for (const property of node.initializer.properties) {
        if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
          && CONFIG_FIELDS.has(property.name.text) && ts.isStringLiteral(property.initializer)) {
          config[property.name.text] = property.initializer.text
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new Error(`${basename(path)} debe contener apiKey, projectId y appId como cadenas en el objeto firebaseConfig.`)
  }
  return config
}

function packageVersion(root: string): string {
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }
  return version
}

/** Built commit, to know which code is published. Empty without git. */
function gitCommit(root: string): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

/**
 * Defines the app's global constants at build time (their types are in firebase-app-kit/globals):
 * - __APP_VERSION__: version from package.json.
 * - __APP_COMMIT__: git commit, or '' if none.
 * - __BUILD_TIME__: build date in ISO format; '' in development.
 * - __FIREBASE_CONFIG__: config read from `firebaseConfigFile`, or {}.
 */
export function firebaseAppKit(options: FirebaseAppKitOptions = {}): Plugin {
  return {
    name: 'firebase-app-kit',
    async config(config, { command }) {
      const root = resolve(config.root ?? process.cwd())
      const firebaseConfig = options.firebaseConfigFile
        ? await readFirebaseConfigFile(resolve(root, options.firebaseConfigFile))
        : {}
      return {
        define: {
          __APP_VERSION__: JSON.stringify(packageVersion(root)),
          __APP_COMMIT__: JSON.stringify(gitCommit(root)),
          __BUILD_TIME__: JSON.stringify(command === 'build' ? new Date().toISOString() : ''),
          __FIREBASE_CONFIG__: JSON.stringify(firebaseConfig),
        },
      }
    },
  }
}
