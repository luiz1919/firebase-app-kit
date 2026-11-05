// Firestore sync state shown in each app's header. Labels are in Spanish, like the apps' UI.
// Each app decides when it is in each state and which detail to show: "Sin conexion" (offline)
// does not mean the same in all of them (in some, changes wait for the network; in others, saving is blocked).

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error'

export const SYNC_LABELS: Readonly<Record<SyncState, string>> = {
  synced: 'Sincronizado',
  syncing: 'Sincronizando',
  offline: 'Sin conexión',
  error: 'Error de sincronización',
}
