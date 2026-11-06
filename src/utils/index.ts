// Utilities without dependencies: usable in the browser and in Node tests.
export { EMAIL_DOMAINS, authErrorMessage, canCompleteEmailDomain, completeEmailDomain, hasEmailDomain } from './auth.ts'
export { fileTimestamp, formatDate, todayIso } from './dates.ts'
export {
  CHUNK_BYTES, chunkCountOf, downloadBlob, fileTypeOf, isTouchDevice, needsNewTap, openFile, readFileBytes, shareOrDownload,
} from './files.ts'
export type { FileType } from './files.ts'
export { PdfDocument, pdfTextWidth, wrapPdfText } from './pdf.ts'
export type { PdfDocumentOptions, PdfInfo, PdfTextStyle } from './pdf.ts'
export { SYNC_LABELS } from './sync.ts'
export type { SyncState } from './sync.ts'
