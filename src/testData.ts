// Helpers for an app's test data generator ("Datos de prueba", only in the dev project).
import { writeBatch } from 'firebase/firestore'
import type { Firestore, WriteBatch } from 'firebase/firestore'

/** One write of a single document in a batch: batch => batch.set(ref, data), update or delete. */
export type BatchWrite = (batch: WriteBatch) => void

export interface WriteProgress {
  done: number
  total: number
}

/** Firestore allows 500 writes per batch; some room is left. */
export const TEST_DATA_BATCH_SIZE = 400

/**
 * Commits the writes in batches, one after another, reporting the progress after each batch.
 * Each batch waits for the server, so this needs a connection (it does not finish offline).
 */
export async function commitInBatches(
  db: Firestore,
  writes: readonly BatchWrite[],
  onProgress?: (progress: WriteProgress) => void,
  batchSize = TEST_DATA_BATCH_SIZE,
): Promise<void> {
  const total = writes.length
  onProgress?.({ done: 0, total })
  for (let start = 0; start < total; start += batchSize) {
    const batch = writeBatch(db)
    for (const write of writes.slice(start, start + batchSize)) write(batch)
    await batch.commit()
    onProgress?.({ done: Math.min(start + batchSize, total), total })
  }
}
