// In-app feedback in Firestore: feedback/{id}, its screenshots (chunk format of chunks.ts) and its
// technical details (private/diagnostics). The rules are in firebase-app-kit/rules/feedback.rules.
// Writes go through the Firestore cache, so they work offline: the returned promises only settle
// when the server confirms, so the UI should not wait for them (show errors when they reject).
import {
  collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import type { DocumentReference, Firestore, Unsubscribe, WriteBatch } from 'firebase/firestore'
import { readChunkedFile, stageChunkedFile, stageChunkedFileDelete } from './chunks.ts'
import { FEEDBACK_LIMITS, cleanFeedbackText, cleanFeedbackTitle, feedbackFromData, sortFeedback } from './utils/feedback.ts'
import type { FeedbackDiagnostics, FeedbackItem, FeedbackKind, FeedbackStatus } from './utils/feedback.ts'
import type { JpegImage } from './utils/image.ts'

export const FEEDBACK_COLLECTION = 'feedback'
/** Most recent feedback items listed (plenty for apps with a handful of users). */
export const FEEDBACK_LIST_LIMIT = 300

export interface FeedbackAuthor {
  uid: string
  email: string | null
}

export interface FeedbackDraft {
  kind: FeedbackKind
  /** Short title (required). */
  title: string
  /** Description (optional). */
  text: string
  /** Up to FEEDBACK_LIMITS.screenshots JPEGs of one chunk each (see imageToJpeg). */
  screenshots: readonly JpegImage[]
  /** Technical details, or null if the user does not want to send them. */
  diagnostics: FeedbackDiagnostics | null
}

const feedbackRef = (db: Firestore, id: string) => doc(db, FEEDBACK_COLLECTION, id)
const screenshotRef = (parent: DocumentReference, index: number) => doc(parent, 'screenshots', String(index))
const diagnosticsRef = (parent: DocumentReference) => doc(parent, 'private', 'diagnostics')

function stageScreenshot(batch: WriteBatch, parent: DocumentReference, index: number, image: JpegImage) {
  stageChunkedFile(batch, screenshotRef(parent, index), image.bytes, {
    index, type: 'image/jpeg', size: image.bytes.length, width: image.width, height: image.height, chunkCount: 1,
  })
}

/** Problem with a draft (in Spanish, for the user), or null if it can be sent. */
export function feedbackDraftProblem(draft: { title: string; text: string }, screenshotCount = 0): string | null {
  const title = cleanFeedbackTitle(draft.title)
  if (!title) return 'Escribe un título.'
  if (title.length > FEEDBACK_LIMITS.title) return `El título es demasiado largo (máximo ${FEEDBACK_LIMITS.title} caracteres).`
  if (cleanFeedbackText(draft.text).length > FEEDBACK_LIMITS.text) return `La descripción es demasiado larga (máximo ${FEEDBACK_LIMITS.text} caracteres).`
  if (screenshotCount > FEEDBACK_LIMITS.screenshots) return `Puedes adjuntar hasta ${FEEDBACK_LIMITS.screenshots} capturas.`
  return null
}

/**
 * Sends new feedback, its screenshots and its technical details in one batch (all or nothing).
 * Returns the new id at once; `committed` settles when the server confirms (later, if offline).
 */
export function submitFeedback(db: Firestore, author: FeedbackAuthor, draft: FeedbackDraft, appVersion: string): { id: string; committed: Promise<void> } {
  const problem = feedbackDraftProblem(draft, draft.screenshots.length)
  if (problem) throw new Error(problem)
  const parent = doc(collection(db, FEEDBACK_COLLECTION))
  const batch = writeBatch(db)
  batch.set(parent, {
    kind: draft.kind,
    title: cleanFeedbackTitle(draft.title),
    text: cleanFeedbackText(draft.text),
    status: 'new',
    createdBy: author.uid,
    createdByEmail: author.email ?? '',
    createdAt: serverTimestamp(),
    editedAt: null,
    appVersion: appVersion.slice(0, FEEDBACK_LIMITS.version),
    screenshotCount: draft.screenshots.length,
    hasDiagnostics: draft.diagnostics !== null,
    reply: '',
    repliedAt: null,
    replyRead: true,
    resolvedVersion: '',
  })
  draft.screenshots.forEach((image, index) => stageScreenshot(batch, parent, index, image))
  if (draft.diagnostics) batch.set(diagnosticsRef(parent), { context: draft.diagnostics.context, errors: draft.diagnostics.errors })
  return { id: parent.id, committed: batch.commit() }
}

/** Follows the most recent feedback of the app, newest first. */
export function watchFeedback(db: Firestore, onItems: (items: FeedbackItem[]) => void, onError: (error: Error) => void): Unsubscribe {
  const recent = query(collection(db, FEEDBACK_COLLECTION), orderBy('createdAt', 'desc'), limit(FEEDBACK_LIST_LIMIT))
  // With metadata changes, the "sending" mark goes away as soon as the server confirms.
  return onSnapshot(
    recent,
    { includeMetadataChanges: true },
    (snapshot) => onItems(sortFeedback(snapshot.docs.map((entry) => ({
      ...feedbackFromData(entry.id, entry.data({ serverTimestamps: 'estimate' })),
      // The server date of the creation is still unknown: it has not reached the server.
      sending: entry.metadata.hasPendingWrites && entry.get('createdAt', { serverTimestamps: 'none' }) === null,
    })))),
    onError,
  )
}

/** Follows whether the user is an admin (a document admins/{uid} exists). Errors count as "no". */
export function watchFeedbackAdmin(db: Firestore, uid: string, onChange: (isAdmin: boolean) => void): Unsubscribe {
  return onSnapshot(doc(db, 'admins', uid), (snapshot) => onChange(snapshot.exists()), () => onChange(false))
}

/** Follows how many of the user's items have a reply they have not read. */
export function watchUnreadFeedbackReplies(db: Firestore, uid: string, onCount: (count: number) => void): Unsubscribe {
  const unread = query(collection(db, FEEDBACK_COLLECTION), where('createdBy', '==', uid), where('replyRead', '==', false))
  return onSnapshot(unread, (snapshot) => onCount(snapshot.size), () => onCount(0))
}

/** Follows how many items are waiting for an admin (status "new"). */
export function watchNewFeedbackCount(db: Firestore, onCount: (count: number) => void): Unsubscribe {
  const waiting = query(collection(db, FEEDBACK_COLLECTION), where('status', '==', 'new'))
  return onSnapshot(waiting, (snapshot) => onCount(snapshot.size), () => onCount(0))
}

export interface FeedbackEdit {
  kind: FeedbackKind
  title: string
  text: string
  /** Screenshots to add after the existing ones (up to FEEDBACK_LIMITS.screenshots in all). */
  screenshots?: readonly JpegImage[]
}

/**
 * The author changes the kind, the title and the description (feedback without a title gets one)
 * and may add screenshots, in one batch. Screenshots already sent stay: they are never replaced.
 */
export function editFeedback(db: Firestore, item: Pick<FeedbackItem, 'id' | 'screenshotCount'>, changes: FeedbackEdit): Promise<void> {
  const added = changes.screenshots ?? []
  const problem = feedbackDraftProblem(changes, item.screenshotCount + added.length)
  if (problem) return Promise.reject(new Error(problem))
  const parent = feedbackRef(db, item.id)
  const batch = writeBatch(db)
  batch.update(parent, {
    kind: changes.kind, title: cleanFeedbackTitle(changes.title), text: cleanFeedbackText(changes.text), editedAt: serverTimestamp(),
    ...(added.length > 0 ? { screenshotCount: item.screenshotCount + added.length } : {}),
  })
  added.forEach((image, offset) => stageScreenshot(batch, parent, item.screenshotCount + offset, image))
  return batch.commit()
}

/** The author has seen the reply. */
export const markFeedbackReplyRead = (db: Firestore, id: string): Promise<void> => updateDoc(feedbackRef(db, id), { replyRead: true })

export interface FeedbackManagement {
  status: FeedbackStatus
  reply: string
  resolvedVersion: string
}

/** Fields an admin's change writes: a new reply is stamped and shows as unread to its author. */
export function feedbackManagementUpdate(item: FeedbackItem, changes: FeedbackManagement, adminUid: string): Record<string, unknown> {
  const reply = cleanFeedbackText(changes.reply).slice(0, FEEDBACK_LIMITS.reply)
  const update: Record<string, unknown> = {
    status: changes.status,
    resolvedVersion: changes.resolvedVersion.trim().slice(0, FEEDBACK_LIMITS.version),
  }
  if (reply !== item.reply) {
    update.reply = reply
    update.repliedAt = reply ? serverTimestamp() : null
    // Answering your own feedback leaves nothing to read.
    update.replyRead = !reply || item.createdBy === adminUid
  }
  return update
}

/** An admin changes the status, the reply and the version that solved it. */
export function manageFeedback(db: Firestore, item: FeedbackItem, changes: FeedbackManagement, adminUid: string): Promise<void> {
  return updateDoc(feedbackRef(db, item.id), feedbackManagementUpdate(item, changes, adminUid))
}

/** An admin deletes the feedback with its screenshots and technical details. */
export function deleteFeedback(db: Firestore, item: Pick<FeedbackItem, 'id' | 'screenshotCount' | 'hasDiagnostics'>): Promise<void> {
  const parent = feedbackRef(db, item.id)
  const batch = writeBatch(db)
  for (let index = 0; index < item.screenshotCount; index += 1) stageChunkedFileDelete(batch, screenshotRef(parent, index), 1)
  if (item.hasDiagnostics) batch.delete(diagnosticsRef(parent))
  batch.delete(parent)
  return batch.commit()
}

/** The screenshots as JPEG blobs (author and admins only). Missing or broken ones are skipped. */
export async function readFeedbackScreenshots(db: Firestore, item: Pick<FeedbackItem, 'id' | 'screenshotCount'>): Promise<Blob[]> {
  const parent = feedbackRef(db, item.id)
  const blobs = await Promise.all(Array.from({ length: item.screenshotCount }, async (_, index) => {
    const ref = screenshotRef(parent, index)
    const metadata = await getDoc(ref)
    const size = Number(metadata.get('size'))
    if (!metadata.exists() || !Number.isInteger(size)) return null
    const bytes = await readChunkedFile(ref, { size, chunkCount: 1 })
    return bytes ? new Blob([bytes], { type: 'image/jpeg' }) : null
  }))
  return blobs.filter((blob): blob is Blob => blob !== null)
}

/** The technical details (author and admins only), or null if there are none. */
export async function readFeedbackDiagnostics(db: Firestore, id: string): Promise<FeedbackDiagnostics | null> {
  const snapshot = await getDoc(diagnosticsRef(feedbackRef(db, id)))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  const context = typeof data.context === 'object' && data.context !== null ? data.context as FeedbackDiagnostics['context'] : {}
  const errors = Array.isArray(data.errors)
    ? data.errors.filter((entry): entry is FeedbackDiagnostics['errors'][number] =>
      typeof entry === 'object' && entry !== null && typeof entry.at === 'string' && typeof entry.message === 'string')
    : []
  return { context, errors }
}
