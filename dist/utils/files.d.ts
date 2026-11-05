/**
 * Size of each chunk a file is stored in, in Firestore. A document holds up to 1 MiB: each chunk
 * leaves room for the other fields. Do NOT change: files already stored and the apps' Firestore
 * rules (data.size() <= 768000) depend on this value.
 */
export declare const CHUNK_BYTES: number;
/** Number of chunks for a file of `size` bytes (at least 1). */
export declare const chunkCountOf: (size: number) => number;
export type FileType = 'application/pdf' | 'image/jpeg' | 'image/png';
/** File type from its content (not its name), or null if it is not a PDF, JPEG or PNG. */
export declare function fileTypeOf(bytes: Uint8Array): FileType | null;
/**
 * Reads a file picked by the user. On iOS reading can fail or hang, so it is time-limited and
 * the error includes its technical name to help diagnose it.
 * It must be read before clearing the <input>: on iOS that can invalidate the file.
 */
export declare function readFileBytes(file: Blob & {
    name: string;
}, timeoutMs?: number): Promise<Uint8Array<ArrayBuffer>>;
/** Downloads a file generated in the browser. */
export declare function downloadBlob(blob: Blob, name: string): void;
