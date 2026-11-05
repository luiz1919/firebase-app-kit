import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseWebConfig } from './config.ts';
export interface FirebaseServices {
    isConfigured: boolean;
    app: FirebaseApp | null;
    auth: Auth | null;
    db: Firestore | null;
}
/**
 * Arranca Firebase si la configuracion esta completa. Si no lo esta, todo es null y la app
 * puede mostrar su aviso de configuracion pendiente.
 *
 * Firestore usa la cache persistente del navegador (IndexedDB), compartida entre pestanas:
 * sin conexion se siguen leyendo los datos y los cambios pendientes se suben al recuperarla.
 */
export declare function initFirebase(config: FirebaseWebConfig): FirebaseServices;
