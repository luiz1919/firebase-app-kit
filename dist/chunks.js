// Archivos guardados en Firestore a trozos: la ficha en un documento y los bytes en su
// subcoleccion chunks/0000, chunks/0001... con la forma { index, data: Bytes }.
// Asi no hace falta Firebase Storage. Cada app decide donde va la ficha y que campos lleva.
import { Bytes, collection, doc, getDocs, getDocsFromServer } from 'firebase/firestore';
import { CHUNK_BYTES, chunkCountOf } from "./utils/files.js";
const chunkRef = (parent, index) => doc(parent, 'chunks', String(index).padStart(4, '0'));
/**
 * Anade a `batch` la ficha del archivo (`metadata`, en `parent`) y sus trozos. Al confirmar el lote
 * se guarda todo o nada. Si la ficha lleva chunkCount, debe coincidir con los trozos de `bytes`.
 */
export function stageChunkedFile(batch, parent, bytes, metadata) {
    const chunkCount = chunkCountOf(bytes.length);
    if ('chunkCount' in metadata && metadata.chunkCount !== chunkCount) {
        throw new Error(`chunkCount (${metadata.chunkCount}) no corresponde a ${bytes.length} bytes (${chunkCount} trozos).`);
    }
    batch.set(parent, metadata);
    for (let index = 0; index < chunkCount; index += 1) {
        const data = bytes.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
        batch.set(chunkRef(parent, index), { index, data: Bytes.fromUint8Array(data) });
    }
}
/** Anade a `batch` el borrado de la ficha y de sus trozos. */
export function stageChunkedFileDelete(batch, parent, chunkCount) {
    for (let index = 0; index < chunkCount; index += 1)
        batch.delete(chunkRef(parent, index));
    batch.delete(parent);
}
/**
 * Junta los trozos leidos de Firestore. Devuelve null si falta alguno o no cuadran con la ficha
 * (numero, orden, tamano). Los trozos sobrantes (indice >= chunkCount) se ignoran.
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
 * Lee y junta los trozos del archivo de `parent`. Devuelve null si no estan todos.
 * Por defecto Firestore usa la cache sin conexion (si los trozos se leyeron antes); con
 * `fromServer: true` siempre los pide al servidor.
 */
export async function readChunkedFile(parent, info, { fromServer = false } = {}) {
    const chunks = collection(parent, 'chunks');
    const snapshot = await (fromServer ? getDocsFromServer(chunks) : getDocs(chunks));
    return joinChunks(snapshot.docs.map((entry) => entry.data()), info);
}
