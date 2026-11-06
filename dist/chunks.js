// Files stored in Firestore in chunks: the metadata in one document and the bytes in its
// chunks/0000, chunks/0001... subcollection, shaped { index, data: Bytes }.
// This way Firebase Storage is not needed. Each app decides where the metadata goes and which fields it has.
import { Bytes, collection, doc, getDocs, getDocsFromServer } from 'firebase/firestore';
import { CHUNK_BYTES, chunkCountOf } from "./utils/files.js";
const chunkRef = (parent, index) => doc(parent, 'chunks', String(index).padStart(4, '0'));
/**
 * Adds the file metadata (`metadata`, at `parent`) and its chunks to `batch`. Committing the batch
 * saves all or nothing. If the metadata has chunkCount, it must match the chunks of `bytes`.
 */
export function stageChunkedFile(batch, parent, bytes, metadata) {
    const chunkCount = chunkCountOf(bytes.length);
    if ('chunkCount' in metadata && metadata.chunkCount !== chunkCount) {
        throw new Error(`chunkCount (${metadata.chunkCount}) does not match ${bytes.length} bytes (${chunkCount} chunks).`);
    }
    batch.set(parent, metadata);
    for (let index = 0; index < chunkCount; index += 1) {
        const data = bytes.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
        batch.set(chunkRef(parent, index), { index, data: Bytes.fromUint8Array(data) });
    }
}
/** Adds the deletion of the metadata and its chunks to `batch`. */
export function stageChunkedFileDelete(batch, parent, chunkCount) {
    for (let index = 0; index < chunkCount; index += 1)
        batch.delete(chunkRef(parent, index));
    batch.delete(parent);
}
/**
 * Joins the chunks read from Firestore. Returns null if any is missing or they do not match the
 * metadata (count, order, size). Extra chunks (index >= chunkCount) are ignored.
 */
export function joinChunks(chunks, { size, chunkCount }) {
    const valid = chunks
        .filter((chunk) => typeof chunk === 'object' && chunk !== null && 'index' in chunk && Number.isInteger(chunk.index)
        && chunk.index >= 0 && chunk.index < chunkCount)
        .sort((first, second) => first.index - second.index);
    if (valid.length !== chunkCount || valid.some((chunk, position) => chunk.index !== position || !(chunk.data instanceof Bytes))) {
        return null;
    }
    const parts = valid.map((chunk) => chunk.data.toUint8Array());
    if (parts.some((part) => part.length === 0 || part.length > CHUNK_BYTES))
        return null;
    if (parts.reduce((total, part) => total + part.length, 0) !== size)
        return null;
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
        bytes.set(part, offset);
        offset += part.length;
    }
    return bytes;
}
/**
 * Reads and joins the chunks of the file at `parent`. Returns null if they are not all there.
 * By default Firestore uses the cache when offline (if the chunks were read before); with
 * `fromServer: true` it always asks the server.
 */
export async function readChunkedFile(parent, info, { fromServer = false } = {}) {
    const chunks = collection(parent, 'chunks');
    const snapshot = await (fromServer ? getDocsFromServer(chunks) : getDocs(chunks));
    return joinChunks(snapshot.docs.map((entry) => entry.data()), info);
}
