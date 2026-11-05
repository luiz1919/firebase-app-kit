// Utilidades sin dependencias: se pueden usar en el navegador y en los tests de Node.
export { EMAIL_DOMAINS, authErrorMessage, canCompleteEmailDomain, completeEmailDomain, hasEmailDomain } from "./auth.js";
export { formatDate, todayIso } from "./dates.js";
export { CHUNK_BYTES, chunkCountOf, downloadBlob, fileTypeOf, readFileBytes } from "./files.js";
export { SYNC_LABELS } from "./sync.js";
