// Constantes que fija el plugin de Vite firebaseAppKit() al compilar.
// Para usarlas, anade "firebase-app-kit/globals" a "types" en tsconfig (ya lo hace config/tsconfig.app.json).

/** Version de package.json. */
declare const __APP_VERSION__: string
/** Commit de git compilado, o '' si no hay git. */
declare const __APP_COMMIT__: string
/** Fecha de compilacion en ISO; '' en desarrollo. */
declare const __BUILD_TIME__: string
/** Configuracion leida del archivo firebaseConfig, o {} si la app no lo usa. */
declare const __FIREBASE_CONFIG__: import('./dist/config.js').FirebaseWebConfig
