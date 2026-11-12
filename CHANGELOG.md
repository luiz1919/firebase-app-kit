# Changelog

Changes to firebase-app-kit, newest first. Each version has a git tag `vX.Y.Z`; apps install it
with `npm install github:luiz1919/firebase-app-kit#vX.Y.Z`. **Upgrade** lists what an app has to
change when it moves to that version.

Versions up to v0.11.0 were written afterwards from the tags, the commits and their diffs.

## Unreleased

_Nothing yet._

## [v0.19.0] - 2026-11-12

### Changed

- Kit development: `npm run release -- --minor` is enough. The summary (`-m`) is optional (the
  commit is then just `vX.Y.Z`), and with nothing under "Unreleased" the CHANGELOG lists the
  commits since the last tag and the changed files instead of refusing the release.

## [v0.18.0] - 2026-11-12

### Changed

- Feedback (`FeedbackButton`), admin: saving an item as "Resuelto" (resolved) goes back to the
  "Comentarios" list, which says «Título» guardado como resuelto (offline: saved on this device,
  uploaded when the connection is back). Other statuses stay on the item, as before.
- Resolved items no longer show "Copiar como Markdown" or "Crear issue en GitHub" (only
  "Eliminar"). The saved status decides: picking "Resuelto" in the menu without saving keeps them,
  and setting an item back to another status brings them back.
- A notice shows once: going on to another view and back, the list or item shows without it.

### Added

- `gitReleaseProblem(root, branch, { allowUncommitted: true })` (deploy): the same checks without
  requiring a clean tree.
- Kit development: `npm run release -- --minor -m "summary"` bumps the version, moves "Unreleased"
  in this file to it, runs the checks, commits (with `dist/`), tags and pushes. See the README.

## [v0.17.0] - 2026-11-12

### Changed

- Feedback list (`FeedbackButton`): the filters are the statuses, with the same words as the
  badges and the admin's status menu: "Todos", "Nuevos", "En curso", "Resueltos", "Descartados"
  and "Míos". "Abiertos" and "Cerrados" are gone (they named no status: an item marked "En
  curso" showed under "Abiertos"). It opens on "Todos"; admins with new feedback still get
  "Nuevos" first, and users with an unread reply "Míos".

### Added

- `feedbackFilters(uid)` and `FEEDBACK_STATUS_FILTER_LABELS` (utils), types `FeedbackFilter`,
  `FeedbackFilterOption`.

## [v0.16.0] - 2026-11-12

### Added

- Deploy option `publishFirestoreRules`: each deploy also publishes `firestore.rules` to the
  production project, after the dev project's (`devProjectId`) and before Hosting, so both get
  the same rules in one go. Off by default (production rules by hand, as before).
- `publishSteps()`: the Firebase CLI calls of a deploy, in order. `--check` now prints them.

### Changed

- If Hosting fails after some Firestore rules were published, the "Release undone" message says
  that those rules are already live, and where.

### Upgrade

- Optional: `deploy({ ..., publishFirestoreRules: true })` in the app's `scripts/deploy.mjs`.

## [v0.15.0] - 2026-11-11

### Added

- `AboutPage` (ui): "Acerca de" (About) as a screen for the app's "Ajustes" (Settings), with the
  app's icon, name and tagline, a description and cards: "Versión", "Entorno" (Pruebas),
  "Tecnología", "Privacidad" and "Enlaces" (placeholders show "Próximamente"). Based on TV
  Launcher's About screen. Types `AboutInfo`, `AboutLink`; `DEFAULT_DEVELOPER`.
- `--kit-card-radius` and `--kit-card-shadow` CSS variables for those cards.

### Changed

- `AboutButton` is now a 40 px info icon (instead of the underlined "Acerca de" link) and its
  dialog shows the same cards as `AboutPage`. It takes the same props (`AboutInfo`): the old ones
  still work, the new ones (icon, tagline, description, technology, privacy, privacyNote, links,
  disclaimer) are optional.
- The "Entorno" section is a card; "Última compilación" reads "Compilación".
- `Developer.url` may be '' (the name without a link).

### Upgrade

- Move "Acerca de" into the app's "Ajustes": a row that opens `<AboutPage {...about} back={...} />`
  (one `AboutInfo` object per app, e.g. `src/about.ts`), and remove `<AboutButton>` from the
  header. Keep `<AboutButton {...about} environment={environment} />` on the sign-in screen,
  placed with the header's icons (it is a 40 px icon now): it is the way back from Pruebas there.

## [v0.14.0] - 2026-11-10

### Added

- "Pruebas" (dev project): a second Firebase project per app with test data, chosen per device in
  "Acerca de" (README, "Pruebas (dev project)"). `initFirebase(prod, { dev })` uses the dev config
  only when chosen and only if it is complete and of another project, and returns `environment`
  (`{ current: 'prod' | 'dev', devAvailable, projectId }`). Config: `firebaseConfigFromEnv(env,
  fallback, 'dev')` reads `VITE_FIREBASE_DEV_*`; the plugin's `devFirebaseConfigFile` defines
  `__FIREBASE_DEV_CONFIG__` (`{}` without it). Helpers: `storedAppEnv`, `switchAppEnv`,
  `chooseFirebaseConfig`, `devConfigProblem`, `assertDevEnvironment`.
- `EnvBanner` (ui): orange "PRUEBAS · estos datos no son reales" band while in Pruebas, with
  `--kit-env-banner-height` for sticky headers and `--kit-env` / `--kit-env-contrast` colours.
- `AboutButton` `environment`, `canSwitchEnvironment` and `testData` props: an "Entorno" section
  with "Cambiar a Pruebas" (for those allowed, e.g. admins) and, in Pruebas, "Volver a Real" (for
  everyone) and the app's test data tools (choose an amount, "Generar datos de prueba", "Borrar
  mis datos de prueba", with progress). `TestDataActions` / `TestDataSize` types.
- `commitInBatches(db, writes, onProgress)` and `BatchWrite` / `WriteProgress`: writes in batches
  of 400 waiting for the server, for test data generators.
- `FeedbackButton` `environment` prop: in Pruebas the dialog says the feedback stays there.
- Deploy `devProjectId`: checks the compiled dev config belongs to it (and refuses a build with a
  dev config but no `devProjectId`), and publishes `firestore.rules` to the dev project before
  Hosting. `buildFirebaseConfigs` and `devFirebaseConfigProblem` (deploy entry).

### Upgrade

- Nothing required: without a dev config apps work as before. To add Pruebas, follow the README.

## [v0.13.0] - 2026-11-10

### Changed

- Feedback has a title and a description: the form asks for a short title (required, up to 120
  characters: "¿Qué falla?", "¿Qué propones?") and an optional description; the list shows only the
  titles and opening an item shows its title and description. Similar feedback is looked up in
  both. `feedback/{id}` gains `title`; `text` (the description) may now be empty. Markdown reports
  and GitHub issues use the title.
- Feedback sent with v0.12.0 (no title) shows its first line as the title and the rest as the
  description (`splitUntitledFeedback`); it can still be answered and marked as read, and its
  author's next edit saves the title.
- `feedbackDraftProblem` takes `{ title, text }`; `FeedbackDraft` and `editFeedback` changes have a
  `title`. New in utils: `cleanFeedbackTitle`, `splitUntitledFeedback`, `FEEDBACK_LIMITS.title`.

### Upgrade

- `npm install github:luiz1919/firebase-app-kit#v0.13.0`, then `npx firebase-app-kit rules` to
  update the feedback block in `firestore.rules` (the deploy fails while it is outdated), run the
  rules tests and publish the rules (`firebase deploy --only firestore:rules`) before deploying:
  the new form writes `title`, which the v0.12.0 rules reject.

## [v0.12.0] - 2026-11-09

### Added

- Feedback ("Comentarios") for every app: `FeedbackButton` in `firebase-app-kit/ui`, a header icon
  that opens a dialog with the app's feedback (filters "Abiertos", "Míos", "Cerrados" and, for
  admins, "Nuevos"), a form (kind, text, up to 3 screenshots, optional technical details, hint of
  similar existing feedback) and each item with its status and reply. Admins (`admins/{uid}`) get
  a count of new items, set status, reply and "resolved in" version, copy it as Markdown, open a
  prefilled GitHub issue and delete. Data in the app's Firestore: `feedback/{id}` with
  `screenshots/` and `private/diagnostics`.
- Firestore side in the main entry (`submitFeedback`, `watchFeedback`, `editFeedback`,
  `manageFeedback`, `markFeedbackReplyRead`, `deleteFeedback`, `readFeedbackScreenshots`,
  `readFeedbackDiagnostics`, watchers for the counts) and hooks in `firebase-app-kit/react`
  (`useFeedbackAdmin`, `useFeedbackBadge`, `useFeedbackList`).
- `firebase-app-kit/utils`: feedback kinds/statuses/labels, `similarFeedback`, `feedbackToMarkdown`,
  `githubIssueUrl`, `collectFeedbackContext`; an error log (`installErrorLog`, `recentErrors`:
  uncaught errors, rejected promises and `console.error`, kept in sessionStorage); images
  `imageToJpeg` (within a size and a byte limit), `imageToJpegBase64` and `fitWithin` (Labia and
  Supermerk2 had the same `image.ts`).
- Firestore rules blocks owned by the kit: `rules/feedback.rules`, added to an app's
  `firestore.rules` and kept current with `npx firebase-app-kit rules [feedback]` (new `bin`).
  `deploy` fails while a block is outdated. `firebase-app-kit/rules-testing` exports
  `feedbackRulesTests`, run by each app against its own rules.

### Upgrade

- Add the feedback: `installErrorLog()` in `main.tsx`, `<FeedbackButton db user appName build
  githubRepo />` before `<SyncStatus />` (one more 40 px column in the header layout),
  `npx firebase-app-kit rules feedback`, `feedbackRulesTests(...)` in the rules tests, publish the
  rules before deploying, and create `admins/{uid}` in the Firebase console. See the README.

### Kit development

- `npm run test:rules` runs the feedback rules tests in the Firestore emulator (port 8089).

## [v0.11.0] - 2026-11-09

### Changed

- `SyncStatus` opens a centred modal `<dialog>`, like `AboutButton`, instead of a dropdown panel
  that overflowed on phones: the state icon and label as title, the explanation, a close button
  and, in the error state with `onDismissError`, "Entendido". Props are unchanged.
- `AboutButton` and `SyncStatus` share `useModalDialog()` (Escape, close, backdrop tap) and the
  `.kit-dialog` / `.kit-dialog-heading` styles.

### Fixed

- Tapping the padding inside a dialog no longer closes it: only a tap outside its box does (also in
  "Acerca de").

### Upgrade

- `.kit-sync-details` is gone: drop any app CSS that targets it.

### Kit development

- CI uses `actions/checkout` and `actions/setup-node` v7; `@types/node` 26.

## [v0.10.1] - 2026-11-08

### Fixed

- The Vite plugin crashed on TypeScript 7 (the native compiler, without the JavaScript compiler
  API) in apps using `firebaseConfigFile` ("Cannot read properties of undefined (reading
  'Latest')"). The file is now read with a small tokenizer (`parseFirebaseConfigSource`): same
  result, no TypeScript needed at run time.

### Kit development

- Built with TypeScript 7.0.2. TypeScript 7 emits single quotes, so `dist/` must be built with it
  or the CI "dist up to date" check fails.
- Dependabot config for npm and GitHub Actions. Dependabot misreads the kit's git tags (it
  proposed v0.10.0 -> v0.3.0 in an app), so the apps' `dependabot.yml` ignore `firebase-app-kit`.

## [v0.10.0] - 2026-11-08

### Added

- `firebase-app-kit/ai`: browser-side, bring-your-own-key adapter for Google Gemini, OpenAI and
  Anthropic Claude (plain `fetch`, no SDKs), moved from CommunityAssistant. New: image input, JSON
  answers (`schema`: Claude structured outputs; Gemini and OpenAI only get JSON mode, so the prompt
  must describe the shape), Claude `effort`, `parseJsonObject`, and an `AiError` instead of a
  partial answer when the provider cuts it at its length limit.
- Shared AI settings shape stored in `users/{uid}/settings/ai`: `parseAiSettings` (drops providers
  without `apiKey`), `activeAi`, `AiSettingsActions`.
- `firebase-app-kit/ui`: `AiSettingsPanel` (keys, connection test, model, Claude fallback).
  `--kit-success` and `--kit-warning` CSS variables.

## [v0.9.0] - 2026-11-08

### Added

- New entry `firebase-app-kit/ui`: `LoginForm` (the form only), `AboutButton` (modal `<dialog>`)
  and `SyncStatus` (with `details` and `onDismissError`). Icons are inline Lucide SVGs, no icon
  dependency.
- `firebase-app-kit/ui.css`: `kit-` classes themed with `--kit-*` CSS variables.
- utils: `BuildInfo`, `formatBuildTime`, `SYNC_DETAILS`, `syncDetail`.

### Upgrade

- Import `firebase-app-kit/ui.css` before the app's own CSS and set the `--kit-*` variables.
- The kit never reads `__APP_VERSION__` and the other build constants: pass them to `AboutButton`
  as a `BuildInfo` (e.g. from a `src/buildInfo.ts`).

## [v0.8.0] - 2026-11-06

### Fixed

- Offline: chunks loaded with `import()` (e.g. a PDF viewer) were deleted from the cache on the next
  refresh. The plugin now writes the build's `/assets/` list into `sw.js` (`BUILD_ASSETS`) and the
  service worker only deletes files that neither the page nor the current build use.

## [v0.7.0] - 2026-11-06

### Added

- `deploy({ changelog: 'Changelog.md' })`: each release adds its version to the changelog in a
  `docs(changelog): vX.Y.Z` commit before the release commit. It uses the entries written under
  "Unreleased", or else the commit subjects since the previous tag (without release commits and
  conventional prefixes), with a GitHub compare link. `--check` previews the entries; a failed
  build or deploy undoes the changelog commit too.

## [v0.6.0] - 2026-11-06

### Added

- utils: `PdfDocument`, `wrapPdfText` and `pdfTextWidth`, a dependency-free text-only PDF writer
  (A4, Helvetica, WinAnsi) extracted from CommunityAssistant's annual report (same output, byte for
  byte).
- utils: `fileTimestamp()` (`YYYY-MM-DD_HHMM`) for generated file names.
- utils: `shareOrDownload`, `openFile`, `needsNewTap`, `isTouchDevice` to hand a generated file to
  the user (Share sheet on mobile, tab or download on desktop), moved from CommunityAssistant.

## [v0.5.0] - 2026-11-06

### Changed

- `deploy()` is now a full release, so a `vX.Y.Z` tag on GitHub always means "published":
  - preflight: on `main` (or `releaseBranch`), nothing uncommitted, not behind the remote, tag free;
  - `npm ci`, Firebase config check, lint and tests;
  - local release commit `chore(release): vX.Y.Z` and annotated tag, then build and Firebase
    Hosting;
  - `git push --atomic` of the commit and the tag. If the build or the deploy fails, the commit,
    the tag and the version are undone; if only the push fails, it prints the command to push.

### Upgrade

- Commit your own changes before `npm run deploy`, and never create release tags by hand.

### Notes

- The tag annotation is just "v0.5.0".

## [v0.4.0] - 2026-11-06

### Added

- `firebaseAppKit({ serviceWorker: { cacheName, staticFiles } })` emits `/sw.js` from
  `sw/service-worker.js` (CommunityAssistant's strategy): network first for pages, cache first for
  `/assets/` and `/icons/`, cleanup of old assets, other origins left alone. Cache lookups ignore
  `Vary`, because `vite preview` sends `Vary: Origin` and module scripts are requested with an
  `Origin` header.

### Changed

- Deploy and dev messages, and the errors thrown by the kit, are in English. User-facing texts
  (`authErrorMessage`, `SYNC_LABELS`) stay in Spanish.

### Upgrade

- Delete the app's `public/sw.js` (the build stops if it finds one) and register `/sw.js` from the
  app, in production only. Changing `cacheName` discards the old caches.

### Notes

- The commits are "translate comments to english", "more updates" and "more fixes", and the tag
  annotation is "Worker and backups": nothing in the diff is about backups.
- The README asked for `#v0.3.1` in between, a version that never existed.

## [v0.3.0] - 2026-11-05

### Added

- Chunked files in Firestore (main entry): `stageChunkedFile`, `stageChunkedFileDelete`,
  `readChunkedFile`, `joinChunks`. Format `parent/chunks/0000 { index, data: Bytes }` with
  `CHUNK_BYTES` = 768000: it must never change (TripPlanner's rules hardcode the size).
- utils: `fileTypeOf`, `readFileBytes`, `downloadBlob`, `CHUNK_BYTES`, `chunkCountOf`,
  `canCompleteEmailDomain`.

### Changed

- `useEmailLogin`: the domain chips stay disabled (`canCompleteDomain`) until there is a valid user
  name, and completing the domain moves on to the password.

### Notes

- Lightweight tag, Spanish commit message.

## [v0.2.0] - 2026-11-05

### Added

- `firebase-app-kit/react`: `useAuthUser`, `useEmailLogin`, `usePopover`, `useOnline`.
- `firebase-app-kit/utils` (pure, works in Node tests): `authErrorMessage`, `EMAIL_DOMAINS`,
  `hasEmailDomain`, `completeEmailDomain`, `SyncState`, `SYNC_LABELS`, `todayIso`, `formatDate`.

### Notes

- Lightweight tag, Spanish commit message.

## v0.1.0 - 2026-11-05

### Added

- `deploy({ appName, projectId })`: TripPlanner's `npm run deploy` flow (Firebase CLI check, change
  type, `npm ci`, config check, lint and tests, version bump, build, Hosting only; version restored
  if it fails).
- `firebaseAppKit()` Vite plugin: `__APP_VERSION__`, `__APP_COMMIT__`, `__BUILD_TIME__`,
  `__FIREBASE_CONFIG__`; `firebase-app-kit/globals` types them.
- `initFirebase` (Auth and Firestore with a persistent cache), `firebaseConfigFromEnv`,
  `isFirebaseConfigured`.
- Base `tsconfig` and `oxlint` configs (`firebase-app-kit/config/*`).

### Notes

- Never tagged: commit [93c55b4](https://github.com/luiz1919/firebase-app-kit/commit/93c55b4).

[v0.19.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.18.0...v0.19.0
[v0.18.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.17.0...v0.18.0
[v0.17.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.16.0...v0.17.0
[v0.16.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.15.0...v0.16.0
[v0.15.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.14.0...v0.15.0
[v0.14.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.13.0...v0.14.0
[v0.13.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.12.0...v0.13.0
[v0.12.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.11.0...v0.12.0
[v0.11.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.10.1...v0.11.0
[v0.10.1]: https://github.com/luiz1919/firebase-app-kit/compare/v0.10.0...v0.10.1
[v0.10.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.9.0...v0.10.0
[v0.9.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.8.0...v0.9.0
[v0.8.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.7.0...v0.8.0
[v0.7.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.6.0...v0.7.0
[v0.6.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.5.0...v0.6.0
[v0.5.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.4.0...v0.5.0
[v0.4.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.3.0...v0.4.0
[v0.3.0]: https://github.com/luiz1919/firebase-app-kit/compare/v0.2.0...v0.3.0
[v0.2.0]: https://github.com/luiz1919/firebase-app-kit/compare/93c55b4...v0.2.0
