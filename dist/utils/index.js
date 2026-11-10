// Utilities without dependencies: usable in the browser and in Node tests.
export { formatBuildTime } from './build.js';
export { EMAIL_DOMAINS, authErrorMessage, canCompleteEmailDomain, completeEmailDomain, hasEmailDomain } from './auth.js';
export { fileTimestamp, formatDate, todayIso } from './dates.js';
export { CHUNK_BYTES, chunkCountOf, downloadBlob, fileTypeOf, isTouchDevice, needsNewTap, openFile, readFileBytes, shareOrDownload, } from './files.js';
export { PdfDocument, pdfTextWidth, wrapPdfText } from './pdf.js';
export { SYNC_DETAILS, SYNC_LABELS, syncDetail } from './sync.js';
export { ERROR_LOG_SIZE, appendErrorEntry, clearErrorLog, describeError, installErrorLog, logError, recentErrors } from './errorLog.js';
export { FEEDBACK_CONTEXT_LABELS, FEEDBACK_KINDS, FEEDBACK_KIND_BADGES, FEEDBACK_KIND_LABELS, FEEDBACK_LIMITS, FEEDBACK_STATUSES, FEEDBACK_STATUS_LABELS, cleanFeedbackText, cleanFeedbackTitle, collectFeedbackContext, feedbackAuthorName, feedbackContextEntries, feedbackFromData, feedbackTitle, feedbackToMarkdown, feedbackWords, formatFeedbackDate, githubIssueUrl, hasUnreadReply, isOpenFeedback, similarFeedback, sortFeedback, splitUntitledFeedback, } from './feedback.js';
export { MAX_IMAGE_SIDE, fitWithin, imageToJpeg, imageToJpegBase64 } from './image.js';
