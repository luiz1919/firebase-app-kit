// Utilities without dependencies: usable in the browser and in Node tests.
export { formatBuildTime } from './build.ts'
export type { BuildInfo } from './build.ts'
export { EMAIL_DOMAINS, authErrorMessage, canCompleteEmailDomain, completeEmailDomain, hasEmailDomain } from './auth.ts'
export { fileTimestamp, formatDate, todayIso } from './dates.ts'
export {
  CHUNK_BYTES, chunkCountOf, downloadBlob, fileTypeOf, isTouchDevice, needsNewTap, openFile, readFileBytes, shareOrDownload,
} from './files.ts'
export type { FileType } from './files.ts'
export { PdfDocument, pdfTextWidth, wrapPdfText } from './pdf.ts'
export type { PdfDocumentOptions, PdfInfo, PdfTextStyle } from './pdf.ts'
export { SYNC_DETAILS, SYNC_LABELS, syncDetail } from './sync.ts'
export type { SyncState } from './sync.ts'
export { ERROR_LOG_SIZE, appendErrorEntry, clearErrorLog, describeError, installErrorLog, logError, recentErrors } from './errorLog.ts'
export type { ErrorLogEntry } from './errorLog.ts'
export {
  FEEDBACK_CONTEXT_LABELS, FEEDBACK_KINDS, FEEDBACK_KIND_BADGES, FEEDBACK_KIND_LABELS, FEEDBACK_LIMITS, FEEDBACK_STATUSES,
  FEEDBACK_STATUS_FILTER_LABELS, FEEDBACK_STATUS_LABELS, cleanFeedbackText, cleanFeedbackTitle, collectFeedbackContext, feedbackAuthorName, feedbackContextEntries, feedbackFromData,
  feedbackFilters, feedbackTitle, feedbackToMarkdown, feedbackWords, formatFeedbackDate, githubIssueUrl, hasUnreadReply, isOpenFeedback, similarFeedback,
  sortFeedback, splitUntitledFeedback,
} from './feedback.ts'
export type { FeedbackDiagnostics, FeedbackFilter, FeedbackFilterOption, FeedbackItem, FeedbackKind, FeedbackReportOptions, FeedbackStatus } from './feedback.ts'
export { MAX_IMAGE_SIDE, fitWithin, imageToJpeg, imageToJpegBase64 } from './image.ts'
export type { ImageToJpegOptions, JpegImage } from './image.ts'
