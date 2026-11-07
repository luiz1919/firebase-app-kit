// Firestore sync state shown in each app's header. Labels are in Spanish, like the apps' UI.
// Each app decides when it is in each state and which detail to show: "Sin conexion" (offline)
// does not mean the same in all of them (in some, changes wait for the network; in others, saving is blocked).
export const SYNC_LABELS = {
    synced: 'Sincronizado',
    syncing: 'Sincronizando',
    offline: 'Sin conexión',
    error: 'Error de sincronización',
};
/** Default explanation of each state, shown in the sync panel. Apps can replace any of them. */
export const SYNC_DETAILS = {
    synced: 'Todos los cambios están guardados en la nube.',
    syncing: 'Conectando o esperando la confirmación de la nube.',
    offline: 'Sin conexión: estás viendo los datos guardados en este dispositivo.',
    error: 'No se han podido sincronizar los datos.',
};
/**
 * Text of the sync panel: the app's detail for the state, or the default one. In the error state,
 * the error message wins when there is one. Empty details count as missing.
 */
export function syncDetail(state, details, error) {
    const detail = details?.[state] || SYNC_DETAILS[state];
    return state === 'error' ? error || detail : detail;
}
