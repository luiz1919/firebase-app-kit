# firebase-app-kit

Shared building blocks for the Vite + React + Firebase apps in `labs/`
(CommunityAssistant and TripPlanner). It only contains infrastructure: no
screens, styles or app-specific data.

| Import | What it does |
|--------|--------------|
| `firebase-app-kit` | `initFirebase(config)`: starts Auth and Firestore with a persistent cache. `firebaseConfigFromEnv(env, fallback)`, `isFirebaseConfigured(config)`. Chunked files in Firestore: `stageChunkedFile`, `stageChunkedFileDelete`, `readChunkedFile`, `joinChunks` |
| `firebase-app-kit/react` | Hooks: `useAuthUser(auth)` (session), `useEmailLogin(auth)` (login form), `usePopover()` (panel that closes on an outside tap or Escape), `useOnline()` |
| `firebase-app-kit/utils` | No dependencies (works in Node tests): `authErrorMessage`, `EMAIL_DOMAINS`, `hasEmailDomain`, `canCompleteEmailDomain`, `completeEmailDomain`, `SyncState`, `SYNC_LABELS`, `todayIso`, `formatDate`, `fileTypeOf`, `readFileBytes`, `downloadBlob`, `CHUNK_BYTES`, `chunkCountOf` |
| `firebase-app-kit/vite` | `firebaseAppKit()` plugin: defines `__APP_VERSION__`, `__APP_COMMIT__`, `__BUILD_TIME__` and `__FIREBASE_CONFIG__`, and can generate the offline service worker (`/sw.js`) |
| `firebase-app-kit/deploy` | `deploy({ appName, projectId })`: the `npm run deploy` flow |
| `firebase-app-kit/globals` | Types for the constants above |
| `firebase-app-kit/config/*` | Base `tsconfig` and `oxlint` configs |

## Install in an app

```bash
npm install github:luiz1919/firebase-app-kit#v0.4.0
```

It is installed from GitHub, not from npm. `dist/` is committed so installing
does not need to compile anything. If the repo is private, `npm install` and
`npm ci` need GitHub access through your git credentials (and the app's CI
needs a token with read access to this repo).

The app provides `react`, `firebase`, `vite` and `typescript`: the kit does not
install its own copy (two copies of Firebase do not share the session or the cache).

User-facing text (login errors, sync labels, dates) is in Spanish, like the
apps' UI.

## Usage

`vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import { firebaseAppKit } from 'firebase-app-kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // firebaseConfigFile is optional: the firebaseConfig block copied from the console,
  // used for any field missing from .env.local.
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

await deploy({ appName: 'My App', projectId: 'my-project', root: new URL('..', import.meta.url) })
```

`tsconfig.app.json` (relative paths stay in the app):

```json
{
  "extends": "firebase-app-kit/config/tsconfig.app.json",
  "compilerOptions": { "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo" },
  "include": ["src"]
}
```

`tsconfig.node.json` works the same way, with `config/tsconfig.node.json` and `"include": ["vite.config.ts"]`.

`.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": ["./node_modules/firebase-app-kit/config/oxlintrc.json"]
}
```

Login (the hooks only hold the logic; each app owns its HTML and styles):

```tsx
import { useEmailLogin } from 'firebase-app-kit/react'
import { EMAIL_DOMAINS } from 'firebase-app-kit/utils'

const { email, setEmail, error, submitting, emailRef, hasDomain, canCompleteDomain, completeDomain, submit } = useEmailLogin(auth)
// <form onSubmit={submit}>, <input ref={emailRef} value={email} ...>,
// chips {!hasDomain && EMAIL_DOMAINS.map(...)} with onClick={() => completeDomain(domain)}
// and disabled={!canCompleteDomain}: a domain cannot be picked until there is a valid username.
```

Dropdown panel:

```tsx
const { open, toggle, buttonRef, panelRef, panelId } = usePopover()
// <button ref={buttonRef} aria-expanded={open} aria-controls={panelId} onClick={toggle}>
// {open && <div ref={panelRef} id={panelId}>...</div>}
```

File attachments in Firestore (no Firebase Storage). The metadata goes in a
document chosen by the app, and the bytes in its `chunks/0000`, `chunks/0001`...
subcollection, shaped `{ index, data: Bytes }`, in chunks of `CHUNK_BYTES`
(750 KiB). **Do not change this format**: files already stored and the apps'
Firestore rules depend on it.

```ts
import { readChunkedFile, stageChunkedFile, stageChunkedFileDelete } from 'firebase-app-kit'
import { chunkCountOf, fileTypeOf, readFileBytes } from 'firebase-app-kit/utils'

const bytes = await readFileBytes(file)                 // with a time limit (iOS)
const type = fileTypeOf(bytes)                          // by content: PDF, JPEG or PNG
const batch = writeBatch(db)
stageChunkedFile(batch, ref, bytes, { name: file.name, type, size: bytes.length, chunkCount: chunkCountOf(bytes.length) })
await batch.commit()                                    // metadata and chunks: all or nothing
const back = await readChunkedFile(ref, { size, chunkCount })   // null if any chunk is missing
```

## Service worker

With the `serviceWorker` option, the plugin emits `/sw.js` in the build from
[`sw/service-worker.js`](sw/service-worker.js), with the app's cache name and static files:

```ts
firebaseAppKit({
  serviceWorker: {
    cacheName: 'my-app-v1',                                     // change it to discard old caches
    staticFiles: ['/manifest.webmanifest', '/icons/icon-192.png'], // files outside /assets/
  },
})
```

- Install: stores the static files, the main page and every `/assets/` file it references.
- Navigation: network first; each fresh page refreshes the stored copy (new assets added, old
  ones deleted). Offline: the last stored page.
- `/assets/` and `/icons/`: cache first. Lookups ignore `Vary` (some servers send `Vary: Origin`).
- Other origins (Firebase, Google) are not touched. Activating deletes every other cache of the origin.

The app registers it itself (only in production, e.g. in `main.tsx`) and must not have a
`public/sw.js`: the build stops if it finds one.

## Deploy

`npm run deploy [-- --check|--patch|--minor|--major]` releases and publishes the app in one
go: the version in Firebase, in `package.json` and the git tag always match. Commit your own
changes first; the script only makes the release commit. It stops at the first step that fails:

1. Checks the Firebase CLI and git: on the release branch (`main`, or `releaseBranch`), nothing
   uncommitted, and not behind the remote (it fetches branches and tags, which also checks access).
2. Asks for the change type (or uses the one given; without an interactive terminal it must be
   passed) and checks that the new `vX.Y.Z` tag does not exist yet.
3. `npm ci`, checks that the Firebase config about to be compiled is complete and belongs to the
   given `projectId`, `npm run lint` and, if the app has a `test` script, `npm test`.
4. Locally: writes the version to `package.json` and `package-lock.json`, commits them as
   `chore(release): vX.Y.Z` and creates the annotated tag `vX.Y.Z`. This happens before building,
   so "Acerca de" (About) shows the published version and commit.
5. `npm run build` and publishes **Hosting only** to the given project. If either fails, the
   commit, the tag and the version are undone: nothing published, nothing pushed.
6. Pushes the release commit and the tag together (`git push --atomic`). If the push fails, the
   app is already published: the script prints the command to push it later.

So a `vX.Y.Z` tag on GitHub always means "this version is published". `--check` runs step 3 and
the build only, without touching git, the version or Firebase.

## Developing the kit

```bash
npm install
npm run check    # lint, types, tests and build to dist/
```

To release a version:

1. Change `version` in `package.json` (for example to 0.5.0) and run `npm run check`.
2. Commit **including `dist/`** and create the tag: `git tag v0.5.0`.
3. `git push && git push --tags`.
4. In each app: `npm install github:luiz1919/firebase-app-kit#v0.5.0`.
   The tag must be in the command: editing it by hand in `package.json` and
   running `npm install` is not enough, because npm does not re-resolve a git
   dependency that is already in `package-lock.json` (it says "up to date" and
   keeps the previous version).

CI checks that `dist/` matches the code in `src/`.
