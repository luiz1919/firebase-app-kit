import type { Dispatch, SetStateAction } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { BuildInfo } from '../utils/build.ts';
import type { FeedbackItem } from '../utils/feedback.ts';
import type { DraftState, FeedbackUser } from './feedbackDraft.ts';
interface FeedbackFormProps {
    db: Firestore;
    user: FeedbackUser;
    appName: string;
    build: BuildInfo;
    draft: DraftState;
    setDraft: Dispatch<SetStateAction<DraftState>>;
    /** The item being edited (only kind, title and description), or null for new feedback. */
    editing: FeedbackItem | null;
    items: FeedbackItem[];
    onOpen: (id: string) => void;
    onDone: (id: string, notice: string) => void;
    onWriteError: (message: string) => void;
}
export declare function FeedbackForm({ db, user, appName, build, draft, setDraft, editing, items, onOpen, onDone, onWriteError }: FeedbackFormProps): import("react").JSX.Element;
export {};
