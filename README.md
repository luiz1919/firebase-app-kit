# firebase-app-kit

Shared building blocks for the Vite + React + Firebase apps in `labs/`
(CommunityAssistant, TripPlanner and Labia). It contains infrastructure and the few UI pieces
every app repeats (login form, "Acerca de" (About), sync status, AI settings); no screens or
app-specific data.

| Import | What it does |
|--------|--------------|
| `firebase-app-kit` | `initFirebase(config)`: starts Auth and Firestore with a persistent cache. `firebaseConfigFromEnv(env, fallback)`, `isFirebaseConfigured(config)`. Chunked files in Firestore: `stageChunkedFile`, `stageChunkedFileDelete`, `readChunkedFile`, `joinChunks` |
| `firebase-app-kit/react` | Hooks: `useAuthUser(auth)` (session), `useEmailLogin(auth)` (login form), `usePopover()` (panel that closes on an outside tap or Escape), `useOnline()` |
| `firebase-app-kit/ai` | No dependencies (works in Node tests): AI with the user's own key, from the browser (Google Gemini, OpenAI, Anthropic Claude). `askAi`, `listModels`, `parseJsonObject`, `AI_PROVIDERS`, `providerName`, `suggestModel`, `AiError`; settings shape `AiSettings`, `DEFAULT_AI_SETTINGS`, `parseAiSettings`, `activeAi` (see [AI](#ai)) |
| `firebase-app-kit/ui` | React components: `LoginForm`, `AboutButton`, `SyncStatus`, `AiSettingsPanel`. Styles in `firebase-app-kit/ui.css`, themed with `--kit-*` CSS variables (see [UI components](#ui-components)) |
| `firebase-app-kit/utils` | No dependencies (works in Node tests): `authErrorMessage`, `EMAIL_DOMAINS`, `hasEmailDomain`, `canCompleteEmailDomain`, `completeEmailDomain`, `SyncState`, `SYNC_LABELS`, `SYNC_DETAILS`, `syncDetail`, `BuildInfo`, `formatBuildTime`, `todayIso`, `formatDate`, `fileTimestamp`, `fileTypeOf`, `readFileBytes`, `downloadBlob`, `CHUNK_BYTES`, `chunkCountOf`. Generated files: `shareOrDownload`, `openFile`, `needsNewTap`, `isTouchDevice` (browser only when called). Text PDF reports: `PdfDocument`, `wrapPdfText`, `pdfTextWidth` |
| `firebase-app-kit/vite` | `firebaseAppKit()` plugin: defines `__APP_VERSION__`, `__APP_COMMIT__`, `__BUILD_TIME__` and `__FIREBASE_CONFIG__`, and can generate the offline service worker (`/sw.js`) |
| `firebase-app-kit/deploy` | `deploy({ appName, projectId, changelog? })`: the `npm run deploy` flow, optionally updating a changelog |
| `firebase-app-kit/globals` | Types for the constants above |
| `firebase-app-kit/config/*` | Base `tsconfig` and `oxlint` configs |

## Install in an app

```bash
npm install github:luiz1919/firebase-app-kit#v0.10.1
```

It is installed from GitHub, not from npm. `dist/` is committed so installing
does not need to compile anything. If the repo is private, `npm install` and
`npm ci` need GitHub access through your git credentials (and the app's CI
needs a token with read access to this repo).

The app provides `react`, `firebase`, `vite` and `typescript`: the kit does not
install its own copy (two copies of Firebase do not share the session or the cache).

User-facing text (login form and errors, sync labels, About, dates) is in Spanish, like the
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

## UI components

`firebase-app-kit/ui` has the pieces that were repeated in every app. They only need React (no
icon library: the icons are inlined from Lucide). Import the styles once, **before** the app's own
CSS so the app can still override any rule:

```tsx
// main.tsx
import 'firebase-app-kit/ui.css'
import './index.css'
```

```tsx
import { AboutButton, LoginForm, SyncStatus } from 'firebase-app-kit/ui'

// The app passes its build constants: Vite's define is not reliable inside pre-bundled dependencies.
const build = { version: __APP_VERSION__, commit: __APP_COMMIT__, buildTime: __BUILD_TIME__ }

<AboutButton appName="Labia" build={build} />
// optional developer={{ name: 'luiz1919 en GitHub', url: 'https://github.com/luiz1919' }} (the default)

<LoginForm auth={auth} sessionError={sessionError} />
// The form only: email with the domain chips, password with show/hide, errors, "Entrar".
// The app owns the page layout and heading around it. With auth null it says Firebase is not configured.

<SyncStatus state={syncState} error={error} details={{ offline: 'Text for this app' }} onDismissError={clearError} />
// details: the app's explanation per state (missing ones use SYNC_DETAILS). In the error state the
// panel shows `error`, or else details.error. onDismissError (optional) adds an "Entendido" button.
```

- `AboutButton`: underlined "Acerca de" link that opens a modal `<dialog>` with the version, commit,
  build date ("Versión de desarrollo" in dev) and developer link. Escape, the close button or a tap
  on the backdrop close it.
- `SyncStatus`: cloud icon button; its panel is positioned against the component's own wrapper
  (`.kit-sync`, `position: relative`), right-aligned with the button. To anchor it to a wider
  container instead, give that container `position: relative` and set `.kit-sync { position: static }`.
- `AiSettingsPanel`: `<AiSettingsPanel settings={aiSettings} actions={aiActions} />`, one card per
  AI provider: save, change or delete the key, "Probar conexión" (Test connection: lists the models
  without spending quota and suggests one), the model, and Claude's fallback checkbox. The app owns
  the page heading and its privacy notes, and stores the settings through `actions` (see [AI](#ai)).

All classes start with `kit-`. Theme them with these optional variables (fallbacks: TripPlanner's colors):

| Variable | Used for |
|----------|----------|
| `--kit-accent` | Links, chips, primary button, focus ring |
| `--kit-accent-hover` | Primary button on hover |
| `--kit-accent-contrast` | Text on the primary button |
| `--kit-accent-soft` | Hover background of chips and icon buttons |
| `--kit-text` | Text of the dialog and the sync panel (default: inherited) |
| `--kit-muted` | Secondary text, icon buttons |
| `--kit-border`, `--kit-input-border` | Borders; text field borders |
| `--kit-surface` | Background of fields, chips, dialog and panel |
| `--kit-danger`, `--kit-danger-soft` | Error text/border and background |
| `--kit-success`, `--kit-success-soft` | "Ok" notices and the free-tier badge of the AI panel |
| `--kit-warning`, `--kit-warning-soft` | Warning notices of the AI panel |
| `--kit-radius` | Corner radius of fields, buttons and panels |
| `--kit-sync-synced`, `--kit-sync-syncing`, `--kit-sync-offline`, `--kit-sync-error` | Sync icon color per state |

For example `:root { --kit-accent: var(--accent); --kit-surface: var(--surface); }`: variables
pointing at the app's own ones follow its dark mode too.

The hooks below remain available for apps that need a different markup.

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

Handing a generated file to the user (a report, a backup). On iOS, Safari only opens the
Share sheet right after a tap: if there was an `await` before (reading chunks...), it throws
`NotAllowedError` and the app shows a button so the user can tap again:

```ts
import { fileTimestamp, needsNewTap, openFile } from 'firebase-app-kit/utils'

const file = new File([bytes], `informe-${fileTimestamp()}.pdf`, { type: 'application/pdf' }) // informe-2026-11-06_1030.pdf
try {
  await openFile(file)          // mobile: Share sheet with preview; desktop: new tab (download if blocked)
} catch (error) {
  if (needsNewTap(error)) setReadyFile(file)   // <button onClick={() => openFile(readyFile)}>Ver el archivo</button>
}
// shareOrDownload(file): mobile Share sheet (Save to Files); desktop download.
```

Text-only PDF reports (A4, standard Helvetica, WinAnsi: accents, ñ and €; no dependencies, no
embedded fonts or images). A cursor moves down the page; pages break on their own:

```ts
import { PdfDocument, wrapPdfText } from 'firebase-app-kit/utils'

const pdf = new PdfDocument()                         // margin 50, footerSpace 40 (points)
pdf.line('Informe 2026', 20, 20, { bold: true })      // text, size, gap above, style
pdf.right('120,00 €', pdf.rightEdge, 10)              // right-aligned, on the last line's height
pdf.rule(8)                                           // light gray line across the page
for (const text of wrapPdfText(longText, 10, pdf.contentWidth)) pdf.line(text, 10, 14)
pdf.ensure(blockHeight)                               // new page if the block does not fit
pdf.footer('Mi App · Informe 2026')                   // on every page, with "Página N de M"
const bytes = pdf.toBytes({ title: 'Informe 2026', producer: 'Mi App' })
```

## AI

`firebase-app-kit/ai` calls the AI providers straight from the browser with the user's own key
(no SDK and no server): Google Gemini (free tier with limits), OpenAI and Anthropic (Claude). The
key belongs to the user and lives in their account, never in the code or the bundle.

```ts
import { activeAi, AiError, askAi, parseAiSettings, parseJsonObject } from 'firebase-app-kit/ai'

const settings = parseAiSettings(snapshot.data())   // users/{uid}/settings/ai, or wherever the app keeps it
const ai = activeAi(settings)                       // last provider used if ready, else the first ready one; null if none
if (ai) {
  try {
    const { text, model, note } = await askAi(ai.provider, { system, question, images, schema }, {
      apiKey: ai.apiKey, model: ai.model,
      fallback: settings.anthropicFallback,           // Claude: retry with another Anthropic model if it refuses
      effort: 'low',                                  // Claude only (output_config.effort)
      maxTokens: 2000,                                // Claude: 16000 by default; others only when given
    })
    const answer = schema ? parseJsonObject(text) : text
  } catch (error) {
    if (error instanceof AiError) show(error.message)   // Spanish; error.kind: auth, quota, network, timeout, refusal, other
  }
}
```

- `images`: `[{ mediaType: 'image/jpeg', data: base64 }]` (no `data:` prefix), sent before the question.
- `schema` (a JSON Schema object) asks for one JSON object. **Claude** gets it as a structured
  output (`output_config.format`, so objects need `additionalProperties: false` and `required`).
  **Gemini** and **OpenAI** only get their JSON mode (`responseMimeType: application/json`,
  `response_format: json_object`), so the prompt must also say "JSON" and describe the shape.
  Read the answer with `parseJsonObject(text)`, which also tolerates Markdown fences and text around
  the object.
- A refused question throws `AiError` with kind `refusal`; an answer cut by the token limit throws
  kind `other` ("La respuesta de la IA se ha cortado...").
- `listModels(provider, apiKey)` checks a key without spending quota; `suggestModel` picks a
  sensible default from that list (Claude: `DEFAULT_ANTHROPIC_MODEL`).

Settings shape, stored per user (suggested document: `users/{uid}/settings/ai`, readable and
writable only by its owner in the Firestore rules):

```ts
interface AiSettings {
  providers: Partial<Record<'anthropic' | 'gemini' | 'openai', { apiKey: string; model: string; models?: string[] }>>
  lastProvider: 'anthropic' | 'gemini' | 'openai' | null
  anthropicFallback: boolean   // true by default
}
```

`parseAiSettings` ignores unknown providers, entries without a key and malformed fields. The
`AiSettingsPanel` component (in `firebase-app-kit/ui`) edits them through `AiSettingsActions`
(`saveProvider(id, partialValues)`, `removeProvider(id)`, `setLastProvider(id)`,
`setAnthropicFallback(enabled)`); with Firestore, `setDoc(ref, { providers: { [id]: values } }, { merge: true })`
saves only the given fields and `deleteField()` removes a provider.

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
- Files of the build loaded later with `import()` (a PDF viewer, for example) are not in the page:
  they are stored the first time they are used and kept until a new build replaces them (the
  plugin writes the build's `/assets/` list into `sw.js`).
- Other origins (Firebase, Google) are not touched. Activating deletes every other cache of the origin.

The app registers it itself (only in production, e.g. in `main.tsx`) and must not have a
`public/sw.js`: the build stops if it finds one.

## Deploy

`npm run deploy [-- --check|--patch|--minor|--major]` releases and publishes the app in one
go: the version in Firebase, in `package.json` and the git tag always match. Commit your own
changes first; the script only makes the release commits. It stops at the first step that fails:

1. Checks the Firebase CLI and git: on the release branch (`main`, or `releaseBranch`), nothing
   uncommitted, and not behind the remote (it fetches branches and tags, which also checks access).
2. Asks for the change type (or uses the one given; without an interactive terminal it must be
   passed) and checks that the new `vX.Y.Z` tag does not exist yet. With the `changelog` option,
   it shows the entries the new version will get (see below).
3. `npm ci`, checks that the Firebase config about to be compiled is complete and belongs to the
   given `projectId`, `npm run lint` and, if the app has a `test` script, `npm test`.
4. Locally: with the `changelog` option, adds the version to the changelog and commits it as
   `docs(changelog): vX.Y.Z`; then writes the version to `package.json` and `package-lock.json`,
   commits them as `chore(release): vX.Y.Z` and creates the annotated tag `vX.Y.Z`. This happens
   before building, so "Acerca de" (About) shows the published version and commit.
5. `npm run build` and publishes **Hosting only** to the given project. If either fails, the
   commits, the tag, the version and the changelog are undone: nothing published, nothing pushed.
6. Pushes the commits and the tag together (`git push --atomic`). If the push fails, the
   app is already published: the script prints the command to push it later.

So a `vX.Y.Z` tag on GitHub always means "this version is published". `--check` runs step 3 and
the build only (and shows the changelog entries it would add), without touching git, the version
or Firebase.

### Changelog

`deploy({ ..., changelog: 'Changelog.md' })` keeps a "Keep a Changelog" style file, newest first:

- The new version (`## [vX.Y.Z] - YYYY-MM-DD`) lists the entries written by hand under
  `## Unreleased`, if there are any. Otherwise it lists the subjects of the commits since the
  previous tag, without the release commits and conventional prefixes (`feat(ui): add x` -> `Add x`).
  Descriptive commit messages make a useful changelog; "more fixes" ends up as it is.
- `## Unreleased` is left empty (`_Nothing yet._`) for the next version. Without that section, the
  version goes before the first `## ` heading; a missing file is created.
- With a GitHub remote, the heading links to the changes since the previous tag
  (`[vX.Y.Z]: https://github.com/owner/repo/compare/...`, added to the links at the end).

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
