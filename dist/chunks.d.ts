import type { DocumentData, DocumentReference, WriteBatch } from 'firebase/firestore';
/** What is needed about a stored file to read it and check it. */
export interface ChunkedFileInfo {
    size: number;
    chunkCount: number;
}
/**
 * Adds the file metadata (`metadata`, at `parent`) and its chunks to `batch`. Committing the batch
 * saves all or nothing. If the metadata has chunkCount, it must match the chunks of `bytes`.
 */
export declare function stageChunkedFile(batch: WriteBatch, parent: DocumentReference, bytes: Uint8Array, metadata: DocumentData): void;
/** Adds the deletion of the metadata and its chunks to `batch`. */
export declare function stageChunkedFileDelete(batch: WriteBatch, parent: DocumentReference, chunkCount: number): void;
/**
 * Joins the chunks read from Firestore. Returns null if any is missing or they do not match the
 * metadata (count, order, size). Extra chunks (index >= chunkCount) are ignored.
 */
export declare function joinChunks(chunks: readonly unknown[], { size, chunkCount }: ChunkedFileInfo): Uint8Array<ArrayBuffer> | null;
/**
 * Reads and joins the chunks of the file at `parent`. Returns null if they are not all there.
 * By default Firestore uses the cache when offline (if the chunks were read before); with
 * `fromServer: true` it always asks the server.
 */
export declare function readChunkedFile(parent: DocumentReference, info: ChunkedFileInfo, { fromServer }?: {
    fromServer?: boolean;
}): Promise<Uint8Array<ArrayBuffer> | null>;
