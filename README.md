# firebase-app-kit

Piezas comunes de las apps Vite + React + Firebase de `labs/`
(CommunityAssistant y TripPlanner). Solo contiene infraestructura: nada de
pantallas, estilos ni datos de cada app.

| Importar | Que hace |
|----------|----------|
| `firebase-app-kit` | `initFirebase(config)`: arranca Auth y Firestore con cache persistente. `firebaseConfigFromEnv(env, fallback)`, `isFirebaseConfigured(config)` |
| `firebase-app-kit/react` | Hooks: `useAuthUser(auth)` (sesion), `useEmailLogin(auth)` (formulario de login), `usePopover()` (panel que se cierra al tocar fuera o con Escape), `useOnline()` |
| `firebase-app-kit/utils` | Sin dependencias (vale en tests de Node): `authErrorMessage`, `EMAIL_DOMAINS`, `hasEmailDomain`, `completeEmailDomain`, `SyncState`, `SYNC_LABELS`, `todayIso`, `formatDate` |
| `firebase-app-kit/vite` | Plugin `firebaseAppKit()`: define `__APP_VERSION__`, `__APP_COMMIT__`, `__BUILD_TIME__` y `__FIREBASE_CONFIG__` |
| `firebase-app-kit/deploy` | `deploy({ appName, projectId })`: el flujo de `npm run deploy` |
| `firebase-app-kit/globals` | Tipos de las constantes anteriores |
| `firebase-app-kit/config/*` | Bases de `tsconfig` y `oxlint` |

## Instalar en una app

```bash
npm install github:luiz1919/firebase-app-kit#v0.2.0
```

Se instala desde GitHub, sin npm. `dist/` esta en el repo para que la
instalacion no tenga que compilar nada. Si el repo es privado, `npm install`
y `npm ci` necesitan acceso a GitHub con tus credenciales de git (y el CI de
la app, un token con permiso de lectura sobre este repo).

`react`, `firebase`, `vite` y `typescript` los pone la app: el kit no instala
su propia copia (dos copias de Firebase no comparten la sesion ni la cache).

## Uso

`vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import { firebaseAppKit } from 'firebase-app-kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // firebaseConfigFile es opcional: el bloque firebaseConfig copiado de la consola,
  // que se usa para los campos que no esten en .env.local.
  plugins: [react(), firebaseAppKit({ firebaseConfigFile: 'firebaseConfig' })],
})
```

`src/firebase.ts`:

```ts
import { firebaseConfigFromEnv, initFirebase } from 'firebase-app-kit'

export const { auth, db } = initFirebase(firebaseConfigFromEnv(import.meta.env, __FIREBASE_CONFIG__))
```

`scripts/deploy.mjs`:

```js
import { deploy } from 'firebase-app-kit/deploy'

await deploy({ appName: 'Mi App', projectId: 'mi-proyecto', root: new URL('..', import.meta.url) })
```

`tsconfig.app.json` (las rutas relativas se quedan en la app):

```json
{
  "extends": "firebase-app-kit/config/tsconfig.app.json",
  "compilerOptions": { "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo" },
  "include": ["src"]
}
```

`tsconfig.node.json` igual, con `config/tsconfig.node.json` e `"include": ["vite.config.ts"]`.

`.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": ["./node_modules/firebase-app-kit/config/oxlintrc.json"]
}
```

Login (los hooks solo llevan la logica; el HTML y los estilos son de cada app):

```tsx
import { useEmailLogin } from 'firebase-app-kit/react'
import { EMAIL_DOMAINS } from 'firebase-app-kit/utils'

const { email, setEmail, error, submitting, emailRef, hasDomain, completeDomain, submit } = useEmailLogin(auth)
// <form onSubmit={submit}>, <input ref={emailRef} value={email} ...>,
// chips {!hasDomain && EMAIL_DOMAINS.map(...)} con onClick={() => completeDomain(domain)}
```

Panel desplegable:

```tsx
const { open, toggle, buttonRef, panelRef, panelId } = usePopover()
// <button ref={buttonRef} aria-expanded={open} aria-controls={panelId} onClick={toggle}>
// {open && <div ref={panelRef} id={panelId}>...</div>}
```

## Deploy

`npm run deploy [-- --check|--patch|--minor|--major]` hace, y se detiene en
el primer paso que falle:

1. Comprueba Firebase CLI y pregunta el tipo de cambio (o usa el indicado).
   Sin terminal interactiva hay que indicarlo.
2. `npm ci`.
3. Comprueba que la configuracion Firebase que se va a compilar esta completa
   y es del `projectId` indicado.
4. `npm run lint` y, si la app tiene script `test`, `npm test`.
5. Escribe la nueva version en `package.json` y `package-lock.json` antes de
   compilar, para que "Acerca de" muestre la version publicada.
6. `npm run build` y publica **solo Hosting** en el proyecto indicado.

Si fallan la compilacion o la publicacion, restaura `package.json` y
`package-lock.json`. No hace commits ni tags. `--check` hace los pasos 2 a 4 y
la compilacion, sin tocar la version ni publicar.

## Desarrollo del kit

```bash
npm install
npm run check    # lint, tipos, tests y compilacion a dist/
```

Para publicar una version:

1. Cambia `version` en `package.json` (por ejemplo a 0.3.0) y ejecuta `npm run check`.
2. Haz commit **incluyendo `dist/`** y crea el tag: `git tag v0.3.0`.
3. `git push && git push --tags`.
4. En cada app: `npm install github:luiz1919/firebase-app-kit#v0.3.0`.

El CI comprueba que `dist/` corresponde al codigo de `src/`.
