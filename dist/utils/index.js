// Utilities without dependencies: usable in the browser and in Node tests.
export { EMAIL_DOMAINS, authErrorMessage, canCompleteEmailDomain, completeEmailDomain, hasEmailDomain } from "./auth.js";
export { fileTimestamp, formatDate, todayIso } from "./dates.js";
export { CHUNK_BYTES, chunkCountOf, downloadBlob, fileTypeOf, isTouchDevice, needsNewTap, openFile, readFileBytes, shareOrDownload, } from "./files.js";
export { PdfDocument, pdfTextWidth, wrapPdfText } from "./pdf.js";
export { SYNC_LABELS } from "./sync.js";
