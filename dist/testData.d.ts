import type { Firestore, WriteBatch } from 'firebase/firestore';
/** One write of a single document in a batch: batch => batch.set(ref, data), update or delete. */
export type BatchWrite = (batch: WriteBatch) => void;
export interface WriteProgress {
    done: number;
    total: number;
}
/** Firestore allows 500 writes per batch; some room is left. */
export declare const TEST_DATA_BATCH_SIZE = 400;
/**
 * Commits the writes in batches, one after another, reporting the progress after each batch.
 * Each batch waits for the server, so this needs a connection (it does not finish offline).
 */
export declare function commitInBatches(db: Firestore, writes: readonly BatchWrite[], onProgress?: (progress: WriteProgress) => void, batchSize?: number): Promise<void>;
