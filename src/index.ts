// Browser entry point (uses Firebase).
export { joinChunks, readChunkedFile, stageChunkedFile, stageChunkedFileDelete } from './chunks.ts'
export type { ChunkedFileInfo } from './chunks.ts'
export { firebaseConfigFromEnv, isFirebaseConfigured } from './config.ts'
export type { FirebaseWebConfig } from './config.ts'
export { initFirebase } from './firebase.ts'
export type { FirebaseServices } from './firebase.ts'
export {
  FEEDBACK_COLLECTION, FEEDBACK_LIST_LIMIT, deleteFeedback, editFeedback, feedbackDraftProblem, feedbackManagementUpdate, manageFeedback,
  markFeedbackReplyRead, readFeedbackDiagnostics, readFeedbackScreenshots, submitFeedback, watchFeedback, watchFeedbackAdmin,
  watchNewFeedbackCount, watchUnreadFeedbackReplies,
} from './feedback.ts'
export type { FeedbackAuthor, FeedbackDraft, FeedbackManagement } from './feedback.ts'
