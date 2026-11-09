import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FEEDBACK_KIND_BADGES, FEEDBACK_STATUS_LABELS } from '../utils/feedback.js';
/** Kind and status badges of a feedback item, plus "Respuesta nueva" (new reply) for its author. */
export function FeedbackBadges({ item, unread = false }) {
    return (_jsxs("span", { className: "kit-feedback-badges", children: [_jsx("span", { className: `kit-feedback-badge kit-feedback-kind-${item.kind}`, children: FEEDBACK_KIND_BADGES[item.kind] }), _jsx("span", { className: `kit-feedback-badge kit-feedback-status-${item.status}`, children: FEEDBACK_STATUS_LABELS[item.status] }), unread && _jsx("span", { className: "kit-feedback-badge kit-feedback-unread", children: "Respuesta nueva" })] }));
}
