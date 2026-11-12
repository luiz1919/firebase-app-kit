import type { Firestore, Unsubscribe } from 'firebase/firestore';
import type { FeedbackDiagnostics, FeedbackItem, FeedbackKind, FeedbackStatus } from './utils/feedback.ts';
import type { JpegImage } from './utils/image.ts';
export declare const FEEDBACK_COLLECTION = "feedback";
/** Most recent feedback items listed (plenty for apps with a handful of users). */
export declare const FEEDBACK_LIST_LIMIT = 300;
export interface FeedbackAuthor {
    uid: string;
    email: string | null;
}
export interface FeedbackDraft {
    kind: FeedbackKind;
    /** Short title (required). */
    title: string;
    /** Description (optional). */
    text: string;
    /** Up to FEEDBACK_LIMITS.screenshots JPEGs of one chunk each (see imageToJpeg). */
    screenshots: readonly JpegImage[];
    /** Technical details, or null if the user does not want to send them. */
    diagnostics: FeedbackDiagnostics | null;
}
/** Problem with a draft (in Spanish, for the user), or null if it can be sent. */
export declare function feedbackDraftProblem(draft: {
    title: string;
    text: string;
}, screenshotCount?: number): string | null;
/**
 * Sends new feedback, its screenshots and its technical details in one batch (all or nothing).
 * Returns the new id at once; `committed` settles when the server confirms (later, if offline).
 */
export declare function submitFeedback(db: Firestore, author: FeedbackAuthor, draft: FeedbackDraft, appVersion: string): {
    id: string;
    committed: Promise<void>;
};
/** Follows the most recent feedback of the app, newest first. */
export declare function watchFeedback(db: Firestore, onItems: (items: FeedbackItem[]) => void, onError: (error: Error) => void): Unsubscribe;
/** Follows whether the user is an admin (a document admins/{uid} exists). Errors count as "no". */
export declare function watchFeedbackAdmin(db: Firestore, uid: string, onChange: (isAdmin: boolean) => void): Unsubscribe;
/** Follows how many of the user's items have a reply they have not read. */
export declare function watchUnreadFeedbackReplies(db: Firestore, uid: string, onCount: (count: number) => void): Unsubscribe;
/** Follows how many items are waiting for an admin (status "new"). */
export declare function watchNewFeedbackCount(db: Firestore, onCount: (count: number) => void): Unsubscribe;
export interface FeedbackEdit {
    kind: FeedbackKind;
    title: string;
    text: string;
    /** Screenshots to add after the existing ones (up to FEEDBACK_LIMITS.screenshots in all). */
    screenshots?: readonly JpegImage[];
}
/**
 * The author changes the kind, the title and the description (feedback without a title gets one)
 * and may add screenshots, in one batch. Screenshots already sent stay: they are never replaced.
 */
export declare function editFeedback(db: Firestore, item: Pick<FeedbackItem, 'id' | 'screenshotCount'>, changes: FeedbackEdit): Promise<void>;
/** The author has seen the reply. */
export declare const markFeedbackReplyRead: (db: Firestore, id: string) => Promise<void>;
export interface FeedbackManagement {
    status: FeedbackStatus;
    reply: string;
    resolvedVersion: string;
}
/** Fields an admin's change writes: a new reply is stamped and shows as unread to its author. */
export declare function feedbackManagementUpdate(item: FeedbackItem, changes: FeedbackManagement, adminUid: string): Record<string, unknown>;
/** An admin changes the status, the reply and the version that solved it. */
export declare function manageFeedback(db: Firestore, item: FeedbackItem, changes: FeedbackManagement, adminUid: string): Promise<void>;
/** An admin deletes the feedback with its screenshots and technical details. */
export declare function deleteFeedback(db: Firestore, item: Pick<FeedbackItem, 'id' | 'screenshotCount' | 'hasDiagnostics'>): Promise<void>;
/** The screenshots as JPEG blobs (author and admins only). Missing or broken ones are skipped. */
export declare function readFeedbackScreenshots(db: Firestore, item: Pick<FeedbackItem, 'id' | 'screenshotCount'>): Promise<Blob[]>;
/** The technical details (author and admins only), or null if there are none. */
export declare function readFeedbackDiagnostics(db: Firestore, id: string): Promise<FeedbackDiagnostics | null>;
