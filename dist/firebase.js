import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { isFirebaseConfigured } from './config.js';
/**
 * Starts Firebase if the config is complete. Otherwise everything is null and the app
 * can show its "setup pending" notice.
 *
 * Firestore uses the browser's persistent cache (IndexedDB), shared across tabs:
 * offline, data can still be read and pending changes are uploaded when back online.
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
