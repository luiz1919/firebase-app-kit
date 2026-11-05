import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { isFirebaseConfigured } from "./config.js";
/**
 * Arranca Firebase si la configuracion esta completa. Si no lo esta, todo es null y la app
 * puede mostrar su aviso de configuracion pendiente.
 *
 * Firestore usa la cache persistente del navegador (IndexedDB), compartida entre pestanas:
 * sin conexion se siguen leyendo los datos y los cambios pendientes se suben al recuperarla.
 */
export function initFirebase(config) {
    const isConfigured = isFirebaseConfigured(config);
    const app = isConfigured ? initializeApp(config) : null;
    return {
        isConfigured,
        app,
        auth: app ? getAuth(app) : null,
        db: app
            ? initializeFirestore(app, {
                localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
            })
            : null,
    };
}
