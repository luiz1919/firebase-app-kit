// Estado de sincronizacion con Firestore que muestra la cabecera de cada app.
// Cada app decide cuando esta en cada estado y que detalle mostrar: "Sin conexion" no significa
// lo mismo en todas (en unas los cambios esperan a la red, en otras no se puede guardar).

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error'

export const SYNC_LABELS: Readonly<Record<SyncState, string>> = {
  synced: 'Sincronizado',
  syncing: 'Sincronizando',
  offline: 'Sin conexión',
  error: 'Error de sincronización',
}
