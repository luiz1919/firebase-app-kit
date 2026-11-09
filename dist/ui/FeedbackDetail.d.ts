import type { Firestore } from 'firebase/firestore';
import type { BuildInfo } from '../utils/build.ts';
import type { FeedbackItem } from '../utils/feedback.ts';
import type { FeedbackUser } from './feedbackDraft.ts';
interface FeedbackDetailProps {
    db: Firestore;
    user: FeedbackUser;
    isAdmin: boolean;
    appName: string;
    build: BuildInfo;
    githubRepo?: string;
    item: FeedbackItem | null;
    ready: boolean;
    notice?: string;
    onEdit: () => void;
    onDeleted: () => void;
    onWriteError: (message: string) => void;
}
export declare function FeedbackDetail({ db, user, isAdmin, appName, build, githubRepo, item, ready, notice, onEdit, onDeleted, onWriteError }: FeedbackDetailProps): import("react").JSX.Element;
export {};
