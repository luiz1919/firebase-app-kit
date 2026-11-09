import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Firestore } from 'firebase/firestore'
import { deleteFeedback, manageFeedback, markFeedbackReplyRead, readFeedbackDiagnostics, readFeedbackScreenshots } from '../feedback.ts'
import type { BuildInfo } from '../utils/build.ts'
import {
  FEEDBACK_KIND_LABELS, FEEDBACK_LIMITS, FEEDBACK_STATUSES, FEEDBACK_STATUS_LABELS, feedbackAuthorName, feedbackContextEntries,
  feedbackToMarkdown, formatFeedbackDate, githubIssueUrl, hasUnreadReply,
} from '../utils/feedback.ts'
import type { FeedbackDiagnostics, FeedbackItem, FeedbackStatus } from '../utils/feedback.ts'
import { FeedbackBadges } from './FeedbackBadges.tsx'
import type { FeedbackUser } from './feedbackDraft.ts'
import { writeErrorMessage } from './feedbackErrors.ts'
import { CopyIcon, ExternalLinkIcon, PencilIcon, TrashIcon } from './icons.tsx'

interface FeedbackDetailProps {
  db: Firestore
  user: FeedbackUser
  isAdmin: boolean
  appName: string
  build: BuildInfo
  githubRepo?: string
  item: FeedbackItem | null
  ready: boolean
  notice?: string
  onEdit: () => void
  onDeleted: () => void
  onWriteError: (message: string) => void
}

export function FeedbackDetail({ db, user, isAdmin, appName, build, githubRepo, item, ready, notice, onEdit, onDeleted, onWriteError }: FeedbackDetailProps) {
  const mine = item?.createdBy === user.uid
  // Screenshots and details are only readable once the feedback is on the server.
  const canSeePrivate = Boolean(item) && (mine || isAdmin) && !item?.sending
  const diagnostics = usePrivateDiagnostics(db, canSeePrivate && item?.hasDiagnostics ? item.id : null)
  const unread = item ? hasUnreadReply(item, user.uid) : false

  const itemId = item?.id ?? ''
  useEffect(() => {
    if (unread && itemId) void markFeedbackReplyRead(db, itemId).catch(() => undefined)
  }, [db, itemId, unread])

  if (!item) return <p className="kit-hint">{ready ? 'Este comentario ya no existe.' : 'Cargando…'}</p>

  return (
    <div className="kit-feedback-view">
      {notice && <p className="kit-notice kit-notice-ok" role="status">{notice}</p>}
      <FeedbackBadges item={item} />
      <p className="kit-feedback-text">{item.text}</p>
      <p className="kit-feedback-meta">
        {FEEDBACK_KIND_LABELS[item.kind]} · {feedbackAuthorName(item.createdByEmail)} · {formatFeedbackDate(item.createdAt)}
        {item.appVersion && ` · v${item.appVersion}`}
        {item.editedAt && ' · editado'}
      </p>
      {item.status === 'done' && item.resolvedVersion && (
        <p className="kit-notice kit-notice-ok">Resuelto en la versión {item.resolvedVersion}{build.version === item.resolvedVersion ? ' (la que estás usando)' : ''}.</p>
      )}
      {item.reply && (
        <section className="kit-feedback-reply" aria-label="Respuesta">
          <h3>Respuesta</h3>
          <p className="kit-feedback-text">{item.reply}</p>
          {item.repliedAt && <p className="kit-feedback-meta">{formatFeedbackDate(item.repliedAt)}</p>}
        </section>
      )}
      {item.sending && <p className="kit-hint">{navigator.onLine ? 'Enviando…' : 'Sin conexión: se enviará cuando vuelva la conexión.'}</p>}
      {canSeePrivate && item.screenshotCount > 0 && <Screenshots db={db} id={item.id} count={item.screenshotCount} />}
      {canSeePrivate && item.hasDiagnostics && <Diagnostics diagnostics={diagnostics} />}
      {mine && (
        <div className="kit-actions">
          <button className="kit-secondary-button" type="button" onClick={onEdit}><PencilIcon />Editar</button>
        </div>
      )}
      {isAdmin && (
        <AdminPanel
          key={item.id}
          db={db}
          user={user}
          item={item}
          appName={appName}
          build={build}
          githubRepo={githubRepo}
          diagnostics={diagnostics.value}
          onDeleted={onDeleted}
          onWriteError={onWriteError}
        />
      )}
    </div>
  )
}

function usePrivateDiagnostics(db: Firestore, id: string | null) {
  const [state, setState] = useState<{ id: string; value: FeedbackDiagnostics | null; error: string }>({ id: '', value: null, error: '' })
  useEffect(() => {
    if (!id) return
    let active = true
    readFeedbackDiagnostics(db, id).then(
      (value) => active && setState({ id, value, error: '' }),
      () => active && setState({ id, value: null, error: 'No se han podido cargar los datos técnicos.' }),
    )
    return () => { active = false }
  }, [db, id])
  return state.id === id ? { value: state.value, error: state.error } : { value: null, error: '' }
}

function Screenshots({ db, id, count }: { db: Firestore; id: string; count: number }) {
  const [urls, setUrls] = useState<string[] | null>(null)
  const [error, setError] = useState('')
  const [zoomed, setZoomed] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    let created: string[] = []
    readFeedbackScreenshots(db, { id, screenshotCount: count }).then(
      (blobs) => {
        if (!active) return
        created = blobs.map((blob) => URL.createObjectURL(blob))
        setUrls(created)
        if (blobs.length < count) setError('Alguna captura no se ha podido cargar.')
      },
      () => active && setError('No se han podido cargar las capturas. Comprueba la conexión.'),
    )
    return () => {
      active = false
      for (const url of created) URL.revokeObjectURL(url)
    }
  }, [db, id, count, attempt])

  return (
    <section className="kit-feedback-section" aria-label="Capturas">
      <h3>Capturas</h3>
      {!urls && !error && <p className="kit-hint">Cargando capturas…</p>}
      {error && (
        <p className="kit-hint">
          {error}{' '}
          <button className="kit-link-button" type="button" onClick={() => { setError(''); setUrls(null); setAttempt((value) => value + 1) }}>Reintentar</button>
        </p>
      )}
      {urls && zoomed !== null && urls[zoomed] && (
        <figure className="kit-feedback-zoom">
          <img src={urls[zoomed]} alt={`Captura ${zoomed + 1}`} />
          <figcaption><button className="kit-link-button" type="button" onClick={() => setZoomed(null)}>Ver en pequeño</button></figcaption>
        </figure>
      )}
      {urls && urls.length > 0 && (
        <ul className="kit-feedback-shots">
          {urls.map((url, index) => (
            <li key={url} className="kit-feedback-shot">
              <button className="kit-feedback-shot-open" type="button" onClick={() => setZoomed(index)} aria-label={`Ver la captura ${index + 1}`} aria-pressed={zoomed === index}>
                <img src={url} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const timeOf = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleTimeString('es-ES')
}

function Diagnostics({ diagnostics }: { diagnostics: { value: FeedbackDiagnostics | null; error: string } }) {
  const { value, error } = diagnostics
  return (
    <details className="kit-feedback-diagnostics">
      <summary>Datos técnicos</summary>
      {error && <p className="kit-hint">{error}</p>}
      {!value && !error && <p className="kit-hint">Cargando…</p>}
      {value && (
        <>
          <dl>
            {feedbackContextEntries(value.context).map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}
          </dl>
          <p className="kit-feedback-label">Últimos errores</p>
          {value.errors.length === 0
            ? <p className="kit-hint">Ninguno.</p>
            : <ol className="kit-feedback-errors">{value.errors.map((entry, index) => <li key={index}><time dateTime={entry.at}>{timeOf(entry.at)}</time> {entry.message}</li>)}</ol>}
        </>
      )}
    </details>
  )
}

interface AdminPanelProps {
  db: Firestore
  user: FeedbackUser
  item: FeedbackItem
  appName: string
  build: BuildInfo
  githubRepo?: string
  diagnostics: FeedbackDiagnostics | null
  onDeleted: () => void
  onWriteError: (message: string) => void
}

function AdminPanel({ db, user, item, appName, build, githubRepo, diagnostics, onDeleted, onWriteError }: AdminPanelProps) {
  const [status, setStatus] = useState<FeedbackStatus>(item.status)
  const [reply, setReply] = useState(item.reply)
  const [resolvedVersion, setResolvedVersion] = useState(item.resolvedVersion)
  const [message, setMessage] = useState('')
  const id = useId()
  const changed = status !== item.status || reply.trim() !== item.reply || resolvedVersion.trim() !== item.resolvedVersion
  const report = { appName, diagnostics }

  function changeStatus(next: FeedbackStatus) {
    setStatus(next)
    // "Resuelto" (done) suggests the version being used, which is usually the one with the fix.
    if (next === 'done' && !resolvedVersion.trim()) setResolvedVersion(build.version)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed) return
    manageFeedback(db, item, { status, reply, resolvedVersion: status === 'done' ? resolvedVersion : '' }, user.uid)
      .catch((saveError: unknown) => onWriteError(writeErrorMessage(saveError, 'guardar los cambios')))
    setMessage('Guardado.')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(feedbackToMarkdown(item, report))
      setMessage('Copiado como Markdown.')
    } catch {
      setMessage('No se ha podido copiar.')
    }
  }

  function remove() {
    if (!window.confirm('¿Eliminar este comentario, con sus capturas y datos técnicos? No se puede deshacer.')) return
    deleteFeedback(db, item).catch((deleteError: unknown) => onWriteError(writeErrorMessage(deleteError, 'eliminar el comentario')))
    onDeleted()
  }

  return (
    <section className="kit-feedback-admin" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Gestión (administrador)</h3>
      <form className="kit-feedback-form" onSubmit={save}>
        <div className="kit-field">
          <label htmlFor={`${id}-status`}>Estado</label>
          <select id={`${id}-status`} className="kit-input" value={status} onChange={(event) => changeStatus(event.target.value as FeedbackStatus)}>
            {FEEDBACK_STATUSES.map((option) => <option key={option} value={option}>{FEEDBACK_STATUS_LABELS[option]}</option>)}
          </select>
        </div>
        {status === 'done' && (
          <div className="kit-field">
            <label htmlFor={`${id}-version`}>Resuelto en la versión</label>
            <input id={`${id}-version`} className="kit-input" value={resolvedVersion} maxLength={FEEDBACK_LIMITS.version} placeholder={build.version} onChange={(event) => setResolvedVersion(event.target.value)} />
          </div>
        )}
        <div className="kit-field">
          <label htmlFor={`${id}-reply`}>Respuesta <span className="kit-feedback-optional">(la verá todo el mundo; al autor le aparecerá como nueva)</span></label>
          <textarea id={`${id}-reply`} className="kit-input kit-feedback-textarea" rows={4} value={reply} maxLength={FEEDBACK_LIMITS.reply} onChange={(event) => setReply(event.target.value)} />
        </div>
        <button className="kit-primary-button" type="submit" disabled={!changed}>Guardar</button>
      </form>
      {message && <p className="kit-notice kit-notice-ok" role="status">{message}</p>}
      <div className="kit-actions">
        <button className="kit-secondary-button" type="button" onClick={() => void copy()}><CopyIcon />Copiar como Markdown</button>
        {githubRepo && (
          <a className="kit-secondary-button" href={githubIssueUrl(githubRepo, item, report)} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon size={16} />Crear issue en GitHub
          </a>
        )}
        <button className="kit-link-button kit-link-danger" type="button" onClick={remove}><TrashIcon />Eliminar</button>
      </div>
    </section>
  )
}
