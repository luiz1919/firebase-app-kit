import { FEEDBACK_KIND_BADGES, FEEDBACK_STATUS_LABELS } from '../utils/feedback.ts'
import type { FeedbackItem } from '../utils/feedback.ts'

/** Kind and status badges of a feedback item, plus "Respuesta nueva" (new reply) for its author. */
export function FeedbackBadges({ item, unread = false }: { item: FeedbackItem; unread?: boolean }) {
  return (
    <span className="kit-feedback-badges">
      <span className={`kit-feedback-badge kit-feedback-kind-${item.kind}`}>{FEEDBACK_KIND_BADGES[item.kind]}</span>
      <span className={`kit-feedback-badge kit-feedback-status-${item.status}`}>{FEEDBACK_STATUS_LABELS[item.status]}</span>
      {unread && <span className="kit-feedback-badge kit-feedback-unread">Respuesta nueva</span>}
    </span>
  )
}
