// Entrada para el navegador (usa Firebase).
export { joinChunks, readChunkedFile, stageChunkedFile, stageChunkedFileDelete } from './chunks.ts'
export type { ChunkedFileInfo } from './chunks.ts'
export { firebaseConfigFromEnv, isFirebaseConfigured } from './config.ts'
export type { FirebaseWebConfig } from './config.ts'
export { initFirebase } from './firebase.ts'
export type { FirebaseServices } from './firebase.ts'
