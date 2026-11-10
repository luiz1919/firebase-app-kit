// Browser entry point (uses Firebase).
export { joinChunks, readChunkedFile, stageChunkedFile, stageChunkedFileDelete } from './chunks.ts'
export type { ChunkedFileInfo } from './chunks.ts'
export { devConfigProblem, firebaseConfigFromEnv, isFirebaseConfigured } from './config.ts'
export type { AppEnv, FirebaseWebConfig } from './config.ts'
export { APP_ENV_STORAGE_KEY, assertDevEnvironment, chooseFirebaseConfig, storedAppEnv, switchAppEnv } from './env.ts'
export type { AppEnvironment } from './env.ts'
export { initFirebase } from './firebase.ts'
export type { FirebaseServices, InitFirebaseOptions } from './firebase.ts'
export { TEST_DATA_BATCH_SIZE, commitInBatches } from './testData.ts'
export type { BatchWrite, WriteProgress } from './testData.ts'
export {
  FEEDBACK_COLLECTION, FEEDBACK_LIST_LIMIT, deleteFeedback, editFeedback, feedbackDraftProblem, feedbackManagementUpdate, manageFeedback,
  markFeedbackReplyRead, readFeedbackDiagnostics, readFeedbackScreenshots, submitFeedback, watchFeedback, watchFeedbackAdmin,
  watchNewFeedbackCount, watchUnreadFeedbackReplies,
} from './feedback.ts'
export type { FeedbackAuthor, FeedbackDraft, FeedbackManagement } from './feedback.ts'
