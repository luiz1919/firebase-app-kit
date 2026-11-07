export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';
export declare const SYNC_LABELS: Readonly<Record<SyncState, string>>;
/** Default explanation of each state, shown in the sync panel. Apps can replace any of them. */
export declare const SYNC_DETAILS: Readonly<Record<SyncState, string>>;
/**
 * Text of the sync panel: the app's detail for the state, or the default one. In the error state,
 * the error message wins when there is one. Empty details count as missing.
 */
export declare function syncDetail(state: SyncState, details?: Partial<Record<SyncState, string>>, error?: string | null): string;
