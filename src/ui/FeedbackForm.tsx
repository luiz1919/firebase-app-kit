import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import type { Firestore } from 'firebase/firestore'
import { editFeedback, feedbackDraftProblem, submitFeedback } from '../feedback.ts'
import type { BuildInfo } from '../utils/build.ts'
import { recentErrors } from '../utils/errorLog.ts'
import {
  FEEDBACK_KINDS, FEEDBACK_KIND_LABELS, FEEDBACK_LIMITS, collectFeedbackContext, feedbackAuthorName, similarFeedback,
} from '../utils/feedback.ts'
import type { FeedbackItem, FeedbackKind } from '../utils/feedback.ts'
import { imageToJpeg } from '../utils/image.ts'
import { CloseIcon, ImagePlusIcon } from './icons.tsx'
import { EMPTY_DRAFT } from './feedbackDraft.ts'
import type { DraftScreenshot, DraftState, FeedbackUser } from './feedbackDraft.ts'
import { writeErrorMessage } from './feedbackErrors.ts'

/** Longest side of a screenshot: phone screenshots stay readable and fit in one chunk. */
const SCREENSHOT_SIDE = 1600

const PLACEHOLDERS: Record<FeedbackKind, string> = {
  bug: 'Qué estabas haciendo, qué esperabas que pasara y qué ha pasado.',
  idea: 'Qué te gustaría poder hacer y para qué te vendría bien.',
  other: 'Los detalles de tu comentario.',
}

const TITLE_LABELS: Record<FeedbackKind, string> = { bug: '¿Qué falla?', idea: '¿Qué propones?', other: 'Título' }
const TITLE_PLACEHOLDERS: Record<FeedbackKind, string> = {
  bug: 'En pocas palabras: «La lista no se guarda sin conexión»',
  idea: 'En pocas palabras: «Modo oscuro»',
  other: 'En pocas palabras',
}

interface FeedbackFormProps {
  db: Firestore
  user: FeedbackUser
  appName: string
  build: BuildInfo
  draft: DraftState
  setDraft: Dispatch<SetStateAction<DraftState>>
  /** The item being edited (kind, title, description, more screenshots), or null for new feedback. */
  editing: FeedbackItem | null
  items: FeedbackItem[]
  onOpen: (id: string) => void
  onDone: (id: string, notice: string) => void
  onWriteError: (message: string) => void
}

export function FeedbackForm({ db, user, appName, build, draft, setDraft, editing, items, onOpen, onDone, onWriteError }: FeedbackFormProps) {
  const [edit, setEdit] = useState(() => ({ kind: editing?.kind ?? 'bug', title: editing?.title ?? '', text: editing?.text ?? '' }))
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  // Screenshots added while editing: unlike the new-feedback draft, they go with the form.
  const [added, setAdded] = useState<DraftScreenshot[]>([])
  const addedUrls = useRef<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const kind = editing ? edit.kind : draft.kind
  const title = editing ? edit.title : draft.title
  const text = editing ? edit.text : draft.text
  const similar = editing ? [] : similarFeedback(`${title}\n${text}`, items)
  const sent = editing?.screenshotCount ?? 0
  const screenshots = editing ? added : draft.screenshots
  const room = FEEDBACK_LIMITS.screenshots - sent - screenshots.length

  useEffect(() => { addedUrls.current = added.map((entry) => entry.url) }, [added])
  useEffect(() => () => { for (const url of addedUrls.current) URL.revokeObjectURL(url) }, [])

  function setScreenshots(update: (current: DraftScreenshot[]) => DraftScreenshot[]) {
    if (editing) setAdded(update)
    else setDraft((current) => ({ ...current, screenshots: update(current.screenshots) }))
  }

  function setKind(next: FeedbackKind) {
    if (editing) setEdit((current) => ({ ...current, kind: next }))
    else setDraft((current) => ({ ...current, kind: next, includeDiagnostics: current.diagnosticsChosen ? current.includeDiagnostics : next === 'bug' }))
  }

  function setTitle(next: string) {
    if (editing) setEdit((current) => ({ ...current, title: next }))
    else setDraft((current) => ({ ...current, title: next }))
  }

  function setText(next: string) {
    if (editing) setEdit((current) => ({ ...current, text: next }))
    else setDraft((current) => ({ ...current, text: next }))
  }

  async function addScreenshots(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const files = [...(input.files ?? [])]
    if (files.length === 0) return
    setError('')
    setProcessing(true)
    try {
      for (const file of files.slice(0, Math.max(room, 0))) {
        const image = await imageToJpeg(file, { maxSide: SCREENSHOT_SIDE })
        const url = URL.createObjectURL(new Blob([image.bytes], { type: 'image/jpeg' }))
        setScreenshots((current) => [...current, { image, url }].slice(0, FEEDBACK_LIMITS.screenshots - sent))
      }
      if (files.length > room) setError(`Solo se pueden adjuntar ${FEEDBACK_LIMITS.screenshots} capturas${sent > 0 ? ' en total' : ''}.`)
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : 'No se ha podido procesar la imagen.')
    } finally {
      // Cleared after reading: on iOS clearing the <input> first can invalidate the files.
      input.value = ''
      setProcessing(false)
    }
  }

  function removeScreenshot(index: number) {
    URL.revokeObjectURL(screenshots[index].url)
    setScreenshots((current) => current.filter((_, position) => position !== index))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = feedbackDraftProblem({ title, text }, sent + screenshots.length)
    if (problem) {
      setError(problem)
      return
    }
    const savedLater = !navigator.onLine
    try {
      if (editing) {
        editFeedback(db, editing, { ...edit, screenshots: added.map((entry) => entry.image) })
          .catch((saveError: unknown) => onWriteError(writeErrorMessage(saveError, 'guardar el comentario')))
        onDone(editing.id, savedLater ? 'Cambios guardados en este dispositivo: se subirán al volver la conexión.' : 'Cambios guardados.')
        return
      }
      const diagnostics = draft.includeDiagnostics ? { context: collectFeedbackContext(build), errors: recentErrors() } : null
      const sent = submitFeedback(db, user, { kind, title, text, screenshots: draft.screenshots.map((entry) => entry.image), diagnostics }, build.version)
      sent.committed.catch((sendError: unknown) => onWriteError(writeErrorMessage(sendError, 'enviar el comentario')))
      for (const entry of draft.screenshots) URL.revokeObjectURL(entry.url)
      setDraft(EMPTY_DRAFT)
      onDone(sent.id, savedLater ? 'Guardado en este dispositivo: se enviará al volver la conexión.' : '¡Gracias! Comentario enviado.')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'No se ha podido enviar el comentario.')
    }
  }

  return (
    <form className="kit-feedback-view kit-feedback-form" onSubmit={submit} noValidate>
      <fieldset className="kit-feedback-fieldset">
        <legend>Tipo</legend>
        <div className="kit-feedback-kinds">
          {FEEDBACK_KINDS.map((option) => (
            <label key={option} className={`kit-chip kit-feedback-kind${option === kind ? ' kit-chip-selected' : ''}`}>
              <input className="kit-sr-only" type="radio" name={`${id}-kind`} value={option} checked={option === kind} onChange={() => setKind(option)} />
              {FEEDBACK_KIND_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="kit-field">
        <label htmlFor={`${id}-title`}>{TITLE_LABELS[kind]}</label>
        <input
          id={`${id}-title`}
          className="kit-input"
          value={title}
          maxLength={FEEDBACK_LIMITS.title}
          placeholder={TITLE_PLACEHOLDERS[kind]}
          autoComplete="off"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="kit-field">
        <label htmlFor={`${id}-text`}>Descripción <span className="kit-feedback-optional">(opcional)</span></label>
        <textarea
          id={`${id}-text`}
          className="kit-input kit-feedback-textarea"
          value={text}
          maxLength={FEEDBACK_LIMITS.text}
          rows={6}
          placeholder={PLACEHOLDERS[kind]}
          onChange={(event) => setText(event.target.value)}
        />
        {text.length > FEEDBACK_LIMITS.text - 300 && <p className="kit-hint">{FEEDBACK_LIMITS.text - text.length} caracteres disponibles.</p>}
      </div>

      {similar.length > 0 && (
        <div className="kit-notice kit-feedback-similar">
          <p>¿Es alguno de estos? Si ya está, no hace falta repetirlo.</p>
          <ul>
            {similar.map((item) => (
              <li key={item.id}><button className="kit-link-button" type="button" onClick={() => onOpen(item.id)}>{item.title}</button></li>
            ))}
          </ul>
        </div>
      )}

      <div className="kit-field">
        <span className="kit-feedback-label">
          Capturas{' '}
          <span className="kit-feedback-optional">
            {sent === 0 ? `(opcional, hasta ${FEEDBACK_LIMITS.screenshots})` : `(ya tiene ${sent}; hasta ${FEEDBACK_LIMITS.screenshots} en total)`}
          </span>
        </span>
        {screenshots.length > 0 && (
          <ul className="kit-feedback-shots">
            {screenshots.map((entry, index) => (
              <li key={entry.url} className="kit-feedback-shot">
                <img src={entry.url} alt={`Captura ${sent + index + 1}`} />
                <button className="kit-icon-button kit-feedback-shot-remove" type="button" onClick={() => removeScreenshot(index)} aria-label={`Quitar la captura ${sent + index + 1}`} title="Quitar"><CloseIcon size={16} /></button>
              </li>
            ))}
          </ul>
        )}
        {room > 0 && (
          <button className="kit-secondary-button kit-feedback-add-shot" type="button" disabled={processing} onClick={() => fileRef.current?.click()}>
            <ImagePlusIcon />{processing ? 'Preparando…' : 'Añadir captura'}
          </button>
        )}
        {editing && room <= 0 && screenshots.length === 0 && <p className="kit-hint">Ya tiene las {FEEDBACK_LIMITS.screenshots} capturas que se pueden adjuntar.</p>}
        {editing && screenshots.length > 0 && <p className="kit-hint">Una vez guardadas, las capturas ya no se pueden quitar.</p>}
        <input ref={fileRef} className="kit-sr-only" type="file" accept="image/*" multiple tabIndex={-1} aria-hidden="true" onChange={(event) => void addScreenshots(event)} />
      </div>

      {!editing && (
        <>
          <label className="kit-checkbox">
            <input
              type="checkbox"
              checked={draft.includeDiagnostics}
              onChange={(event) => {
                const checked = event.target.checked
                setDraft((current) => ({ ...current, includeDiagnostics: checked, diagnosticsChosen: true }))
              }}
            />
            <span>Incluir datos técnicos <span className="kit-feedback-optional">(versión, navegador, pantalla y últimos errores: ayudan a encontrar el fallo)</span></span>
          </label>
        </>
      )}

      <p className="kit-hint">
        Todos los usuarios de {appName} verán el título, la descripción y tu nombre ({feedbackAuthorName(user.email ?? '')}).
        {editing ? ' Las capturas solo las verán tú y el administrador.' : ' Las capturas y los datos técnicos solo los verán tú y el administrador.'}
      </p>

      {error && <p className="kit-error" role="alert">{error}</p>}
      <button className="kit-primary-button" type="submit" disabled={processing}>{editing ? 'Guardar cambios' : 'Enviar'}</button>
    </form>
  )
}
