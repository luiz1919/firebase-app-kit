import { useId } from 'react'
import { SYNC_LABELS, syncDetail } from '../utils/sync.ts'
import type { SyncState } from '../utils/sync.ts'
import { CloseIcon, CloudAlertIcon, CloudCheckIcon, CloudOffIcon, CloudUploadIcon } from './icons.tsx'
import { useModalDialog } from './useModalDialog.ts'

export interface SyncStatusProps {
  state: SyncState
  /** Error message, shown in the dialog in the error state. */
  error?: string | null
  /** The app's explanation of each state; missing ones use SYNC_DETAILS. */
  details?: Partial<Record<SyncState, string>>
  /** With it, the error dialog shows an "Entendido" (Got it) button that calls it and closes the dialog. */
  onDismissError?: () => void
}

const ICONS = { synced: CloudCheckIcon, syncing: CloudUploadIcon, offline: CloudOffIcon, error: CloudAlertIcon } as const

/**
 * Cloud icon with the sync state; tapping it opens a centred modal dialog (like "Acerca de") with
 * the explanation and a close button, so it fits any screen. It follows the state while open.
 */
export function SyncStatus({ state, error, details, onDismissError }: SyncStatusProps) {
  const { open, close, dialogProps } = useModalDialog()
  const titleId = useId()
  const label = SYNC_LABELS[state]
  const Icon = ICONS[state]

  return (
    <div className="kit-sync">
      <button className={`kit-icon-button kit-sync-button kit-sync-${state}`} type="button" title={label} aria-label={`Estado de sincronización: ${label}`} aria-haspopup="dialog" onClick={open}><Icon /></button>
      <span className="kit-sr-only" role="status">{label}</span>
      <dialog className="kit-dialog kit-sync-dialog" aria-labelledby={titleId} {...dialogProps}>
        <div className="kit-dialog-heading">
          <h2 id={titleId}><span className={`kit-sync-icon kit-sync-${state}`} aria-hidden="true"><Icon /></span>{label}</h2>
          <button className="kit-icon-button" type="button" autoFocus onClick={close} aria-label="Cerrar el estado de sincronización" title="Cerrar"><CloseIcon /></button>
        </div>
        <p className="kit-sync-text">{syncDetail(state, details, error)}</p>
        {state === 'error' && onDismissError && (
          <button className="kit-secondary-button" type="button" onClick={() => { onDismissError(); close() }}>Entendido</button>
        )}
      </dialog>
    </div>
  )
}
