import { usePopover } from '../react/popover.ts'
import { SYNC_LABELS, syncDetail } from '../utils/sync.ts'
import type { SyncState } from '../utils/sync.ts'
import { CloudAlertIcon, CloudCheckIcon, CloudOffIcon, CloudUploadIcon } from './icons.tsx'

export interface SyncStatusProps {
  state: SyncState
  /** Error message, shown in the panel in the error state. */
  error?: string | null
  /** The app's explanation of each state; missing ones use SYNC_DETAILS. */
  details?: Partial<Record<SyncState, string>>
  /** With it, the error panel shows an "Entendido" (Got it) button that calls it and closes the panel. */
  onDismissError?: () => void
}

const ICONS = { synced: CloudCheckIcon, syncing: CloudUploadIcon, offline: CloudOffIcon, error: CloudAlertIcon } as const

/**
 * Cloud icon with the sync state; tapping it opens a panel with the explanation. The panel is
 * positioned against the component's own wrapper (position: relative).
 */
export function SyncStatus({ state, error, details, onDismissError }: SyncStatusProps) {
  const { open, toggle, close, buttonRef, panelRef, panelId } = usePopover()
  const label = SYNC_LABELS[state]
  const Icon = ICONS[state]

  return (
    <div className="kit-sync">
      <button ref={buttonRef} className={`kit-icon-button kit-sync-button kit-sync-${state}`} type="button" title={label} aria-label={`Estado de sincronización: ${label}`} aria-expanded={open} aria-controls={panelId} onClick={toggle}><Icon /></button>
      <span className="kit-sr-only" role="status">{label}</span>
      {open && (
        <div ref={panelRef} className="kit-sync-details" id={panelId} role="region" aria-label="Detalle de sincronización">
          <strong>{label}</strong>
          <p>{syncDetail(state, details, error)}</p>
          {state === 'error' && onDismissError && (
            <button className="kit-secondary-button" type="button" onClick={() => { onDismissError(); close() }}>Entendido</button>
          )}
        </div>
      )}
    </div>
  )
}
