import type { Firestore } from 'firebase/firestore';
import type { FeedbackItem } from '../utils/feedback.ts';
/** Whether the user is a feedback admin (a document admins/{uid} exists). */
export declare function useFeedbackAdmin(db: Firestore | null, uid: string): boolean;
/**
 * Number shown on the feedback button: replies the user has not read and, for admins, the items
 * waiting for them (status "new").
 */
export declare function useFeedbackBadge(db: Firestore | null, uid: string, isAdmin: boolean): {
    unreadReplies: number;
    waiting: number;
};
/** The app's feedback, newest first, followed live while `enabled`. */
export declare function useFeedbackList(db: Firestore | null, enabled?: boolean): {
    items: FeedbackItem[];
    ready: boolean;
    error: string;
};
