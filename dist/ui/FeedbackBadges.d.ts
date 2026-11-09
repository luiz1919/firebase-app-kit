import type { FeedbackItem } from '../utils/feedback.ts';
/** Kind and status badges of a feedback item, plus "Respuesta nueva" (new reply) for its author. */
export declare function FeedbackBadges({ item, unread }: {
    item: FeedbackItem;
    unread?: boolean;
}): import("react").JSX.Element;
