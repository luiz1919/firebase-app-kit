import type { BuildInfo } from './build.ts';
import type { ErrorLogEntry } from './errorLog.ts';
export declare const FEEDBACK_KINDS: readonly ['bug', 'idea', 'other'];
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
/** Kind as the user picks it. */
export declare const FEEDBACK_KIND_LABELS: Readonly<Record<FeedbackKind, string>>;
/** Kind in the badges of the list. */
export declare const FEEDBACK_KIND_BADGES: Readonly<Record<FeedbackKind, string>>;
export declare const FEEDBACK_STATUSES: readonly ['new', 'in-progress', 'done', 'declined'];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export declare const FEEDBACK_STATUS_LABELS: Readonly<Record<FeedbackStatus, string>>;
/** Limits shared with the Firestore rules. */
export declare const FEEDBACK_LIMITS: {
    readonly text: 4000;
    readonly reply: 4000;
    readonly version: 40;
    readonly screenshots: 3;
};
export interface FeedbackItem {
    id: string;
    kind: FeedbackKind;
    text: string;
    status: FeedbackStatus;
    createdBy: string;
    createdByEmail: string;
    /** null only for a moment, while the server date of a new item is pending. */
    createdAt: Date | null;
    editedAt: Date | null;
    /** App version the feedback was sent from. */
    appVersion: string;
    screenshotCount: number;
    hasDiagnostics: boolean;
    /** Admin's reply, or ''. */
    reply: string;
    repliedAt: Date | null;
    /** false while the author has not seen the latest reply. */
    replyRead: boolean;
    /** Version that solved it, or ''. */
    resolvedVersion: string;
    /** Created on this device and not on the server yet (not stored: from the snapshot metadata). */
    sending: boolean;
}
/** Technical details sent with the feedback when the user allows it (feedback/{id}/private/diagnostics). */
export interface FeedbackDiagnostics {
    context: Record<string, string | number | boolean>;
    errors: ErrorLogEntry[];
}
/** Reads a feedback document defensively (unknown values fall back to safe defaults). */
export declare function feedbackFromData(id: string, data: Record<string, unknown>): FeedbackItem;
export declare const isOpenFeedback: (item: Pick<FeedbackItem, 'status'>) => boolean;
/** The author has a reply they have not seen yet. */
export declare const hasUnreadReply: (item: FeedbackItem, uid: string) => boolean;
/** Name shown for an author: the part of the email before the @. */
export declare const feedbackAuthorName: (email: string) => string;
/** First non-empty line, shortened to `max` characters. */
export declare function feedbackTitle(value: string, max?: number): string;
/** Text as it is stored: trimmed, with Windows line breaks and runs of blank lines tidied. */
export declare const cleanFeedbackText: (value: string) => string;
/** Newest first; items still waiting for their server date go on top. */
export declare function sortFeedback(items: readonly FeedbackItem[]): FeedbackItem[];
/** "9 nov 2026", or "Ahora" while the server date is pending. */
export declare const formatFeedbackDate: (date: Date | null) => string;
/** Normalised word stems of a text (case, accents and common words ignored; 5-letter stems). */
export declare function feedbackWords(value: string): Set<string>;
/**
 * Feedback that looks like `value` (shared words), most similar first, to avoid repeating a
 * suggestion. Needs at least two words in common, or one when the text has a single word.
 */
export declare function similarFeedback(value: string, items: readonly FeedbackItem[], { excludeId, limit }?: {
    excludeId?: string;
    limit?: number;
}): FeedbackItem[];
/** Labels of the technical details, in the order they are shown. */
export declare const FEEDBACK_CONTEXT_LABELS: Readonly<Record<string, string>>;
/** Technical details of this device and build, for a bug report. Browser only (empty values in Node). */
export declare function collectFeedbackContext(build: BuildInfo): Record<string, string | boolean>;
/** Technical details as [label, value] pairs: known keys first, in order, then any others. */
export declare function feedbackContextEntries(context: FeedbackDiagnostics['context']): [string, string][];
export interface FeedbackReportOptions {
    appName: string;
    diagnostics?: FeedbackDiagnostics | null;
}
/** The feedback as Markdown, to paste into an issue or a chat. */
export declare function feedbackToMarkdown(item: FeedbackItem, options: FeedbackReportOptions): string;
/**
 * Link to a new GitHub issue with the title, body and label filled in (no token needed: the admin
 * reviews and submits it on GitHub). `repo` is "owner/name". Long texts are cut to fit the URL.
 */
export declare function githubIssueUrl(repo: string, item: FeedbackItem, options: FeedbackReportOptions): string;
