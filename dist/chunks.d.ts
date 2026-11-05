import type { DocumentData, DocumentReference, WriteBatch } from 'firebase/firestore';
/** Lo que hay que saber de un archivo guardado para leerlo y comprobarlo. */
export interface ChunkedFileInfo {
    size: number;
    chunkCount: number;
}
/**
 * Anade a `batch` la ficha del archivo (`metadata`, en `parent`) y sus trozos. Al confirmar el lote
 * se guarda todo o nada. Si la ficha lleva chunkCount, debe coincidir con los trozos de `bytes`.
 */
export declare function stageChunkedFile(batch: WriteBatch, parent: DocumentReference, bytes: Uint8Array, metadata: DocumentData): void;
/** Anade a `batch` el borrado de la ficha y de sus trozos. */
export declare function stageChunkedFileDelete(batch: WriteBatch, parent: DocumentReference, chunkCount: number): void;
/**
 * Junta los trozos leidos de Firestore. Devuelve null si falta alguno o no cuadran con la ficha
 * (numero, orden, tamano). Los trozos sobrantes (indice >= chunkCount) se ignoran.
 */
export declare function joinChunks(chunks: readonly unknown[], { size, chunkCount }: ChunkedFileInfo): Uint8Array<ArrayBuffer> | null;
/**
 * Lee y junta los trozos del archivo de `parent`. Devuelve null si no estan todos.
 * Por defecto Firestore usa la cache sin conexion (si los trozos se leyeron antes); con
 * `fromServer: true` siempre los pide al servidor.
 */
export declare function readChunkedFile(parent: DocumentReference, info: ChunkedFileInfo, { fromServer }?: {
    fromServer?: boolean;
}): Promise<Uint8Array<ArrayBuffer> | null>;
