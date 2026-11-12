import type { Firestore } from 'firebase/firestore';
import type { AppEnvironment } from '../env.ts';
import type { BuildInfo } from '../utils/build.ts';
import type { FeedbackUser } from './feedbackDraft.ts';
export interface FeedbackButtonProps {
    /** The app's Firestore; without it (Firebase not configured) nothing is shown. */
    db: Firestore | null;
    user: FeedbackUser;
    appName: string;
    /** The app's build constants, like AboutButton: sent with the feedback. */
    build: BuildInfo;
    /** "owner/repo" on GitHub: admins get a "Crear issue en GitHub" link. */
    githubRepo?: string;
    /** Project in use (initFirebase(...).environment): in "Pruebas" the dialog says the feedback stays there. */
    environment?: AppEnvironment;
}
/**
 * Feedback icon (for the app header, next to the sync status) that opens a modal dialog: the
 * app's feedback (all, by status, mine), a form for new feedback with screenshots and technical
 * details, and each item with its status and reply. Admins (admins/{uid} in Firestore) see a
 * count of new items and manage them. The draft survives closing the dialog.
 */
export declare function FeedbackButton({ db, user, appName, build, githubRepo, environment }: FeedbackButtonProps): import("react").JSX.Element | null;
