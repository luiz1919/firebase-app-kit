import { useEffect, useState } from 'react'
import type { Firestore } from 'firebase/firestore'
import { watchFeedback, watchFeedbackAdmin, watchNewFeedbackCount, watchUnreadFeedbackReplies } from '../feedback.ts'
import type { FeedbackItem } from '../utils/feedback.ts'

/** Whether the user is a feedback admin (a document admins/{uid} exists). */
export function useFeedbackAdmin(db: Firestore | null, uid: string): boolean {
  const [admin, setAdmin] = useState<{ uid: string; value: boolean }>({ uid: '', value: false })
  useEffect(() => {
    if (!db || !uid) return
    return watchFeedbackAdmin(db, uid, (value) => setAdmin({ uid, value }))
  }, [db, uid])
  return admin.uid === uid && admin.value
}

/**
 * Number shown on the feedback button: replies the user has not read and, for admins, the items
 * waiting for them (status "new").
 */
export function useFeedbackBadge(db: Firestore | null, uid: string, isAdmin: boolean): { unreadReplies: number; waiting: number } {
  const [unreadReplies, setUnreadReplies] = useState(0)
  const [waiting, setWaiting] = useState(0)
  useEffect(() => {
    if (!db || !uid) return
    return watchUnreadFeedbackReplies(db, uid, setUnreadReplies)
  }, [db, uid])
  useEffect(() => {
    if (!db || !isAdmin) return
    return watchNewFeedbackCount(db, setWaiting)
  }, [db, isAdmin])
  return { unreadReplies: db && uid ? unreadReplies : 0, waiting: db && isAdmin ? waiting : 0 }
}

/** The app's feedback, newest first, followed live while `enabled`. */
export function useFeedbackList(db: Firestore | null, enabled = true): { items: FeedbackItem[]; ready: boolean; error: string } {
  const [state, setState] = useState<{ items: FeedbackItem[]; ready: boolean; error: string }>({ items: [], ready: false, error: '' })
  useEffect(() => {
    if (!db || !enabled) return
    return watchFeedback(
      db,
      (items) => setState({ items, ready: true, error: '' }),
      () => setState((current) => ({ ...current, ready: true, error: 'No se han podido cargar los comentarios.' })),
    )
  }, [db, enabled])
  return state
}
