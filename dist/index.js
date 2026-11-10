// Browser entry point (uses Firebase).
export { joinChunks, readChunkedFile, stageChunkedFile, stageChunkedFileDelete } from './chunks.js';
export { devConfigProblem, firebaseConfigFromEnv, isFirebaseConfigured } from './config.js';
export { APP_ENV_STORAGE_KEY, assertDevEnvironment, chooseFirebaseConfig, storedAppEnv, switchAppEnv } from './env.js';
export { initFirebase } from './firebase.js';
export { TEST_DATA_BATCH_SIZE, commitInBatches } from './testData.js';
export { FEEDBACK_COLLECTION, FEEDBACK_LIST_LIMIT, deleteFeedback, editFeedback, feedbackDraftProblem, feedbackManagementUpdate, manageFeedback, markFeedbackReplyRead, readFeedbackDiagnostics, readFeedbackScreenshots, submitFeedback, watchFeedback, watchFeedbackAdmin, watchNewFeedbackCount, watchUnreadFeedbackReplies, } from './feedback.js';
