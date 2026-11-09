import { useId, useRef, useState } from 'react'
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import type { Firestore } from 'firebase/firestore'
import { editFeedback, feedbackDraftProblem, submitFeedback } from '../feedback.ts'
import type { BuildInfo } from '../utils/build.ts'
import { recentErrors } from '../utils/errorLog.ts'
import {
  FEEDBACK_KINDS, FEEDBACK_KIND_LABELS, FEEDBACK_LIMITS, collectFeedbackContext, feedbackAuthorName, feedbackTitle, similarFeedback,
} from '../utils/feedback.ts'
import type { FeedbackItem, FeedbackKind } from '../utils/feedback.ts'
import { imageToJpeg } from '../utils/image.ts'
import { CloseIcon, ImagePlusIcon } from './icons.tsx'
import { EMPTY_DRAFT } from './feedbackDraft.ts'
import type { DraftState, FeedbackUser } from './feedbackDraft.ts'
import { writeErrorMessage } from './feedbackErrors.ts'

/** Longest side of a screenshot: phone screenshots stay readable and fit in one chunk. */
const SCREENSHOT_SIDE = 1600

const PLACEHOLDERS: Record<FeedbackKind, string> = {
  bug: 'Qué estabas haciendo, qué esperabas que pasara y qué ha pasado.',
  idea: 'Qué te gustaría poder hacer y para qué te vendría bien.',
  other: 'Escribe tu comentario.',
}

interface FeedbackFormProps {
  db: Firestore
  user: FeedbackUser
  appName: string
  build: BuildInfo
  draft: DraftState
  setDraft: Dispatch<SetStateAction<DraftState>>
  /** The item being edited (only kind and text), or null for new feedback. */
  editing: FeedbackItem | null
  items: FeedbackItem[]
  onOpen: (id: string) => void
  onDone: (id: string, notice: string) => void
  onWriteError: (message: string) => void
}

export function FeedbackForm({ db, user, appName, build, draft, setDraft, editing, items, onOpen, onDone, onWriteError }: FeedbackFormProps) {
  const [edit, setEdit] = useState(() => ({ kind: editing?.kind ?? 'bug', text: editing?.text ?? '' }))
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const kind = editing ? edit.kind : draft.kind
  const text = editing ? edit.text : draft.text
  const similar = editing ? [] : similarFeedback(text, items)
  const room = FEEDBACK_LIMITS.screenshots - draft.screenshots.length

  function setKind(next: FeedbackKind) {
    if (editing) setEdit((current) => ({ ...current, kind: next }))
    else setDraft((current) => ({ ...current, kind: next, includeDiagnostics: current.diagnosticsChosen ? current.includeDiagnostics : next === 'bug' }))
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
        setDraft((current) => ({ ...current, screenshots: [...current.screenshots, { image, url }].slice(0, FEEDBACK_LIMITS.screenshots) }))
      }
      if (files.length > room) setError(`Solo se pueden adjuntar ${FEEDBACK_LIMITS.screenshots} capturas.`)
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : 'No se ha podido procesar la imagen.')
    } finally {
      // Cleared after reading: on iOS clearing the <input> first can invalidate the files.
      input.value = ''
      setProcessing(false)
    }
  }

  function removeScreenshot(index: number) {
    setDraft((current) => {
      URL.revokeObjectURL(current.screenshots[index].url)
      return { ...current, screenshots: current.screenshots.filter((_, position) => position !== index) }
    })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = feedbackDraftProblem(text, editing ? 0 : draft.screenshots.length)
    if (problem) {
      setError(problem)
      return
    }
    const savedLater = !navigator.onLine
    try {
      if (editing) {
        editFeedback(db, editing.id, edit).catch((saveError: unknown) => onWriteError(writeErrorMessage(saveError, 'guardar el comentario')))
        onDone(editing.id, savedLater ? 'Cambios guardados en este dispositivo: se subirán al volver la conexión.' : 'Cambios guardados.')
        return
      }
      const diagnostics = draft.includeDiagnostics ? { context: collectFeedbackContext(build), errors: recentErrors() } : null
      const sent = submitFeedback(db, user, { kind, text, screenshots: draft.screenshots.map((entry) => entry.image), diagnostics }, build.version)
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
        <label htmlFor={`${id}-text`}>{kind === 'idea' ? '¿Qué propones?' : kind === 'bug' ? '¿Qué ha pasado?' : 'Tu comentario'}</label>
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
              <li key={item.id}><button className="kit-link-button" type="button" onClick={() => onOpen(item.id)}>{feedbackTitle(item.text, 70)}</button></li>
            ))}
          </ul>
        </div>
      )}

      {!editing && (
        <>
          <div className="kit-field">
            <span className="kit-feedback-label">Capturas <span className="kit-feedback-optional">(opcional, hasta {FEEDBACK_LIMITS.screenshots})</span></span>
            {draft.screenshots.length > 0 && (
              <ul className="kit-feedback-shots">
                {draft.screenshots.map((entry, index) => (
                  <li key={entry.url} className="kit-feedback-shot">
                    <img src={entry.url} alt={`Captura ${index + 1}`} />
                    <button className="kit-icon-button kit-feedback-shot-remove" type="button" onClick={() => removeScreenshot(index)} aria-label={`Quitar la captura ${index + 1}`} title="Quitar"><CloseIcon size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
            {room > 0 && (
              <button className="kit-secondary-button kit-feedback-add-shot" type="button" disabled={processing} onClick={() => fileRef.current?.click()}>
                <ImagePlusIcon />{processing ? 'Preparando…' : 'Añadir captura'}
              </button>
            )}
            <input ref={fileRef} className="kit-sr-only" type="file" accept="image/*" multiple tabIndex={-1} aria-hidden="true" onChange={(event) => void addScreenshots(event)} />
          </div>

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
        Todos los usuarios de {appName} verán el texto y tu nombre ({feedbackAuthorName(user.email ?? '')}).
        {!editing && ' Las capturas y los datos técnicos solo los verán tú y el administrador.'}
      </p>

      {error && <p className="kit-error" role="alert">{error}</p>}
      <button className="kit-primary-button" type="submit" disabled={processing}>{editing ? 'Guardar cambios' : 'Enviar'}</button>
    </form>
  )
}
