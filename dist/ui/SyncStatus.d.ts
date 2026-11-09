import type { SyncState } from '../utils/sync.ts';
export interface SyncStatusProps {
    state: SyncState;
    /** Error message, shown in the dialog in the error state. */
    error?: string | null;
    /** The app's explanation of each state; missing ones use SYNC_DETAILS. */
    details?: Partial<Record<SyncState, string>>;
    /** With it, the error dialog shows an "Entendido" (Got it) button that calls it and closes the dialog. */
    onDismissError?: () => void;
}
/**
 * Cloud icon with the sync state; tapping it opens a centred modal dialog (like "Acerca de") with
 * the explanation and a close button, so it fits any screen. It follows the state while open.
 */
export declare function SyncStatus({ state, error, details, onDismissError }: SyncStatusProps): import("react").JSX.Element;
