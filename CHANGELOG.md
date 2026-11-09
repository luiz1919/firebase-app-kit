# Changelog

Changes to firebase-app-kit, newest first. Each version has a git tag `vX.Y.Z`; apps install it
with `npm install github:luiz1919/firebase-app-kit#vX.Y.Z`. **Upgrade** lists what an app has to
change when it moves to that version.

Versions up to v0.11.0 were written afterwards from the tags, the commits and their diffs.

## Unreleased

_Nothing yet._

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
