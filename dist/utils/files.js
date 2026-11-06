// File attachments (PDFs and photos). No dependencies.
/**
 * Size of each chunk a file is stored in, in Firestore. A document holds up to 1 MiB: each chunk
 * leaves room for the other fields. Do NOT change: files already stored and the apps' Firestore
 * rules (data.size() <= 768000) depend on this value.
 */
export const CHUNK_BYTES = 750 * 1024;
/** Number of chunks for a file of `size` bytes (at least 1). */
export const chunkCountOf = (size) => Math.max(1, Math.ceil(size / CHUNK_BYTES));
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** File type from its content (not its name), or null if it is not a PDF, JPEG or PNG. */
export function fileTypeOf(bytes) {
    if (bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-')
        return 'application/pdf';
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
        return 'image/jpeg';
    if (bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((value, index) => bytes[index] === value))
        return 'image/png';
    return null;
}
/**
 * Reads a file picked by the user. On iOS reading can fail or hang, so it is time-limited and
 * the error includes its technical name to help diagnose it.
 * It must be read before clearing the <input>: on iOS that can invalidate the file.
 */
export async function readFileBytes(file, timeoutMs = 15_000) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new DOMException('Timed out', 'TimeoutError')), timeoutMs);
    });
    try {
        return new Uint8Array(await Promise.race([file.arrayBuffer(), timeout]));
    }
    catch (readError) {
        const reason = readError instanceof Error ? readError.name : 'Error';
        throw new Error(`No se ha podido leer «${file.name}» (${reason}).`);
    }
    finally {
        clearTimeout(timer);
    }
}
/** Downloads a file generated in the browser. */
export function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
