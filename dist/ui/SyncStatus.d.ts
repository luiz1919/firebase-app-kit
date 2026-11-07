import type { SyncState } from '../utils/sync.ts';
export interface SyncStatusProps {
    state: SyncState;
    /** Error message, shown in the panel in the error state. */
    error?: string | null;
    /** The app's explanation of each state; missing ones use SYNC_DETAILS. */
    details?: Partial<Record<SyncState, string>>;
    /** With it, the error panel shows an "Entendido" (Got it) button that calls it and closes the panel. */
    onDismissError?: () => void;
}
/**
 * Cloud icon with the sync state; tapping it opens a panel with the explanation. The panel is
 * positioned against the component's own wrapper (position: relative).
 */
export declare function SyncStatus({ state, error, details, onDismissError }: SyncStatusProps): import("react").JSX.Element;
