import type { FeedbackKind } from '../utils/feedback.ts';
import type { JpegImage } from '../utils/image.ts';
export interface FeedbackUser {
    uid: string;
    email: string | null;
}
export interface DraftScreenshot {
    image: JpegImage;
    /** Object URL of the thumbnail (revoked when removed or sent). */
    url: string;
}
/** The new feedback being written; kept by FeedbackButton so it survives closing the dialog. */
export interface DraftState {
    kind: FeedbackKind;
    title: string;
    text: string;
    screenshots: DraftScreenshot[];
    includeDiagnostics: boolean;
    /** The user changed the checkbox: the kind no longer decides it. */
    diagnosticsChosen: boolean;
}
export declare const EMPTY_DRAFT: DraftState;
