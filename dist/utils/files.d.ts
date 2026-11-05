/**
 * Tamano de cada trozo con que se guarda un archivo en Firestore. Un documento admite hasta 1 MiB:
 * cada trozo deja margen para los demas campos. NO cambiar: los archivos ya guardados y las reglas
 * de Firestore de las apps (data.size() <= 768000) dependen de este valor.
 */
export declare const CHUNK_BYTES: number;
/** Numero de trozos de un archivo de `size` bytes (al menos 1). */
export declare const chunkCountOf: (size: number) => number;
export type FileType = 'application/pdf' | 'image/jpeg' | 'image/png';
/** Tipo de un archivo segun su contenido (no segun el nombre), o null si no es PDF, JPEG ni PNG. */
export declare function fileTypeOf(bytes: Uint8Array): FileType | null;
/**
 * Lee un archivo elegido por el usuario. En iOS la lectura puede fallar o quedarse colgada, asi que
 * se limita el tiempo y el error incluye su nombre tecnico para poder diagnosticarlo.
 * Hay que leerlo antes de vaciar el <input>: en iOS eso puede invalidar el archivo.
 */
export declare function readFileBytes(file: Blob & {
    name: string;
}, timeoutMs?: number): Promise<Uint8Array<ArrayBuffer>>;
/** Descarga un archivo generado en el navegador. */
export declare function downloadBlob(blob: Blob, name: string): void;
