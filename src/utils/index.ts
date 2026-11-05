// Utilities without dependencies: usable in the browser and in Node tests.
export { EMAIL_DOMAINS, authErrorMessage, canCompleteEmailDomain, completeEmailDomain, hasEmailDomain } from './auth.ts'
export { formatDate, todayIso } from './dates.ts'
export { CHUNK_BYTES, chunkCountOf, downloadBlob, fileTypeOf, readFileBytes } from './files.ts'
export type { FileType } from './files.ts'
export { SYNC_LABELS } from './sync.ts'
export type { SyncState } from './sync.ts'
