import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
const CONFIG_FIELDS = new Set(['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId']);
/** Lee el objeto firebaseConfig de un archivo copiado de la consola de Firebase. Si no existe, devuelve {}. */
export async function readFirebaseConfigFile(path) {
    if (!existsSync(path))
        return {};
    // Solo se carga TypeScript si la app usa el archivo: asi se lee el objeto sin ejecutar el codigo.
    const { default: ts } = await import('typescript');
    const source = ts.createSourceFile('firebaseConfig.ts', readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const config = {};
    function visit(node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'firebaseConfig'
            && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
            for (const property of node.initializer.properties) {
                if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
                    && CONFIG_FIELDS.has(property.name.text) && ts.isStringLiteral(property.initializer)) {
                    config[property.name.text] = property.initializer.text;
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    if (!config.apiKey || !config.projectId || !config.appId) {
        throw new Error(`${basename(path)} debe contener apiKey, projectId y appId como cadenas en el objeto firebaseConfig.`);
    }
    return config;
}
function packageVersion(root) {
    const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    return version;
}
/** Commit compilado, para saber que codigo hay publicado. Vacio si no hay git. */
function gitCommit(root) {
    try {
        return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    }
    catch {
        return '';
    }
}
/**
 * Define las constantes globales de la app al compilar (sus tipos estan en firebase-app-kit/globals):
 * - __APP_VERSION__: version de package.json.
 * - __APP_COMMIT__: commit de git, o '' si no hay.
 * - __BUILD_TIME__: fecha de compilacion en ISO; '' en desarrollo.
 * - __FIREBASE_CONFIG__: configuracion leida de `firebaseConfigFile`, o {}.
 */
export function firebaseAppKit(options = {}) {
    return {
        name: 'firebase-app-kit',
        async config(config, { command }) {
            const root = resolve(config.root ?? process.cwd());
            const firebaseConfig = options.firebaseConfigFile
                ? await readFirebaseConfigFile(resolve(root, options.firebaseConfigFile))
                : {};
            return {
                define: {
                    __APP_VERSION__: JSON.stringify(packageVersion(root)),
                    __APP_COMMIT__: JSON.stringify(gitCommit(root)),
                    __BUILD_TIME__: JSON.stringify(command === 'build' ? new Date().toISOString() : ''),
                    __FIREBASE_CONFIG__: JSON.stringify(firebaseConfig),
                },
            };
        },
    };
}
