// Constants set at build time by the firebaseAppKit() Vite plugin.
// To use them, add "firebase-app-kit/globals" to "types" in tsconfig (config/tsconfig.app.json already does).

/** Version from package.json. */
declare const __APP_VERSION__: string
/** Git commit that was built, or '' without git. */
declare const __APP_COMMIT__: string
/** Build date in ISO format; '' in development. */
declare const __BUILD_TIME__: string
/** Config read from the firebaseConfig file, or {} if the app does not use it. */
declare const __FIREBASE_CONFIG__: import('./dist/config.js').FirebaseWebConfig
