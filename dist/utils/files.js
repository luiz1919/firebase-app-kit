// Archivos adjuntos (PDF y fotos). Sin dependencias.
/**
 * Tamano de cada trozo con que se guarda un archivo en Firestore. Un documento admite hasta 1 MiB:
 * cada trozo deja margen para los demas campos. NO cambiar: los archivos ya guardados y las reglas
 * de Firestore de las apps (data.size() <= 768000) dependen de este valor.
 */
export const CHUNK_BYTES = 750 * 1024;
/** Numero de trozos de un archivo de `size` bytes (al menos 1). */
export const chunkCountOf = (size) => Math.max(1, Math.ceil(size / CHUNK_BYTES));
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Tipo de un archivo segun su contenido (no segun el nombre), o null si no es PDF, JPEG ni PNG. */
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
 * Lee un archivo elegido por el usuario. En iOS la lectura puede fallar o quedarse colgada, asi que
 * se limita el tiempo y el error incluye su nombre tecnico para poder diagnosticarlo.
 * Hay que leerlo antes de vaciar el <input>: en iOS eso puede invalidar el archivo.
 */
export async function readFileBytes(file, timeoutMs = 15_000) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new DOMException('Tiempo agotado', 'TimeoutError')), timeoutMs);
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
/** Descarga un archivo generado en el navegador. */
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
