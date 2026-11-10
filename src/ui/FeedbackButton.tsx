import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Firestore } from 'firebase/firestore'
import type { AppEnvironment } from '../env.ts'
import { useFeedbackAdmin, useFeedbackBadge, useFeedbackList } from '../react/feedback.ts'
import type { BuildInfo } from '../utils/build.ts'
import { installErrorLog } from '../utils/errorLog.ts'
import { feedbackAuthorName, formatFeedbackDate, hasUnreadReply, isOpenFeedback } from '../utils/feedback.ts'
import type { FeedbackItem } from '../utils/feedback.ts'
import { FeedbackBadges } from './FeedbackBadges.tsx'
import { FeedbackDetail } from './FeedbackDetail.tsx'
import { FeedbackForm } from './FeedbackForm.tsx'
import { EMPTY_DRAFT } from './feedbackDraft.ts'
import type { DraftState, FeedbackUser } from './feedbackDraft.ts'
import { ArrowLeftIcon, CloseIcon, MessageIcon, PlusIcon } from './icons.tsx'
import { useModalDialog } from './useModalDialog.ts'

export interface FeedbackButtonProps {
  /** The app's Firestore; without it (Firebase not configured) nothing is shown. */
  db: Firestore | null
  user: FeedbackUser
  appName: string
  /** The app's build constants, like AboutButton: sent with the feedback. */
  build: BuildInfo
  /** "owner/repo" on GitHub: admins get a "Crear issue en GitHub" link. */
  githubRepo?: string
  /** Project in use (initFirebase(...).environment): in "Pruebas" the dialog says the feedback stays there. */
  environment?: AppEnvironment
}

type View = { name: 'list' } | { name: 'new' } | { name: 'edit'; id: string } | { name: 'detail'; id: string; notice?: string }
type Filter = 'waiting' | 'open' | 'mine' | 'closed'

const VIEW_TITLES: Record<View['name'], string> = { list: 'Comentarios', new: 'Nuevo comentario', edit: 'Editar comentario', detail: 'Comentario' }

/**
 * Feedback icon (for the app header, next to the sync status) that opens a modal dialog: the
 * app's feedback (open, mine, closed), a form for new feedback with screenshots and technical
 * details, and each item with its status and reply. Admins (admins/{uid} in Firestore) see a
 * count of new items and manage them. The draft survives closing the dialog.
 */
export function FeedbackButton({ db, user, appName, build, githubRepo, environment }: FeedbackButtonProps) {
  const isAdmin = useFeedbackAdmin(db, user.uid)
  const { unreadReplies, waiting } = useFeedbackBadge(db, user.uid, isAdmin)
  const { open, close, dialogProps } = useModalDialog()
  const [isOpen, setOpen] = useState(false)
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT)
  const [writeError, setWriteError] = useState('')
  const titleId = useId()

  useEffect(() => installErrorLog(), [])

  if (!db) return null
  const count = unreadReplies + waiting
  const countLabel = [
    waiting > 0 ? `${waiting} ${waiting === 1 ? 'nuevo' : 'nuevos'}` : '',
    unreadReplies > 0 ? `${unreadReplies} ${unreadReplies === 1 ? 'respuesta sin leer' : 'respuestas sin leer'}` : '',
  ].filter(Boolean).join(', ')

  function show() {
    setOpen(true)
    open()
  }

  return (
    <div className="kit-feedback">
      <button className="kit-icon-button kit-feedback-button" type="button" title="Comentarios" aria-label={countLabel ? `Comentarios: ${countLabel}` : 'Comentarios'} aria-haspopup="dialog" onClick={show}>
        <MessageIcon />
        {count > 0 && <span className="kit-feedback-count" aria-hidden="true">{count > 9 ? '9+' : count}</span>}
      </button>
      <dialog className="kit-dialog kit-feedback-dialog" aria-labelledby={titleId} {...dialogProps} onClose={() => setOpen(false)}>
        {isOpen && (
          <FeedbackPanel
            db={db}
            user={user}
            isAdmin={isAdmin}
            appName={appName}
            build={build}
            githubRepo={githubRepo}
            environment={environment}
            draft={draft}
            setDraft={setDraft}
            writeError={writeError}
            setWriteError={setWriteError}
            initialFilter={isAdmin && waiting > 0 ? 'waiting' : unreadReplies > 0 ? 'mine' : 'open'}
            titleId={titleId}
            onClose={close}
          />
        )}
      </dialog>
    </div>
  )
}

interface PanelProps extends Omit<FeedbackButtonProps, 'db'> {
  db: Firestore
  isAdmin: boolean
  draft: DraftState
  setDraft: Dispatch<SetStateAction<DraftState>>
  writeError: string
  setWriteError: (message: string) => void
  initialFilter: Filter
  titleId: string
  onClose: () => void
}

function FeedbackPanel(props: PanelProps) {
  const { db, initialFilter, titleId, onClose, writeError, setWriteError } = props
  const { items, ready, error } = useFeedbackList(db)
  const [views, setViews] = useState<View[]>([{ name: 'list' }])
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const view = views[views.length - 1]
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    // A new view starts at the top of the dialog, with the focus on its title.
    headingRef.current?.closest('dialog')?.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [views])

  const go = useCallback((next: View) => setViews((current) => [...current, next]), [])
  const back = useCallback(() => setViews((current) => (current.length > 1 ? current.slice(0, -1) : current)), [])
  /** Replaces the whole history (after sending or deleting, "back" goes to the list). */
  const reset = useCallback((next: View) => setViews(next.name === 'list' ? [next] : [{ name: 'list' }, next]), [])
  const find = (id: string) => items.find((item) => item.id === id) ?? null

  function content() {
    const editing = view.name === 'edit' ? find(view.id) : null
    if (view.name === 'list') {
      return (
        <FeedbackList
          {...props}
          items={items}
          ready={ready}
          error={error}
          filter={filter}
          onFilter={setFilter}
          onNew={() => go({ name: 'new' })}
          onOpen={(id) => go({ name: 'detail', id })}
        />
      )
    }
    if (view.name === 'new' || editing) {
      return (
        <FeedbackForm
          {...props}
          key={editing ? editing.id : 'new'}
          editing={editing}
          items={items}
          onOpen={(id) => go({ name: 'detail', id })}
          onDone={(id, notice) => reset({ name: 'detail', id, notice })}
          onWriteError={setWriteError}
        />
      )
    }
    // A detail, or an edit whose item was deleted meanwhile (the detail says so).
    return (
      <FeedbackDetail
        {...props}
        key={view.id}
        item={find(view.id)}
        ready={ready}
        notice={view.name === 'detail' ? view.notice : undefined}
        onEdit={() => go({ name: 'edit', id: view.id })}
        onDeleted={() => reset({ name: 'list' })}
        onWriteError={setWriteError}
      />
    )
  }

  return (
    <>
      <div className="kit-dialog-heading kit-feedback-heading">
        {views.length > 1 && (
          <button className="kit-icon-button kit-feedback-back" type="button" onClick={back} aria-label="Volver" title="Volver"><ArrowLeftIcon /></button>
        )}
        <h2 id={titleId} ref={headingRef} tabIndex={-1}>{VIEW_TITLES[view.name]}</h2>
        <button className="kit-icon-button" type="button" autoFocus onClick={onClose} aria-label="Cerrar los comentarios" title="Cerrar"><CloseIcon /></button>
      </div>
      {props.environment?.current === 'dev' && (
        <p className="kit-notice kit-notice-warn kit-feedback-banner">Estás en Pruebas: estos comentarios se guardan en la base de datos de pruebas, no en la real.</p>
      )}
      {writeError && (
        <div className="kit-notice kit-notice-error kit-feedback-banner" role="alert">
          <span>{writeError}</span>
          <button className="kit-link-button" type="button" onClick={() => setWriteError('')}>Entendido</button>
        </div>
      )}
      {content()}
    </>
  )
}

interface ListProps extends PanelProps {
  items: FeedbackItem[]
  ready: boolean
  error: string
  filter: Filter
  onFilter: (filter: Filter) => void
  onNew: () => void
  onOpen: (id: string) => void
}

function FeedbackList({ items, ready, error, filter, onFilter, onNew, onOpen, user, isAdmin, appName }: ListProps) {
  const filters: { id: Filter; label: string; matches: (item: FeedbackItem) => boolean }[] = [
    ...(isAdmin ? [{ id: 'waiting' as const, label: 'Nuevos', matches: (item: FeedbackItem) => item.status === 'new' }] : []),
    { id: 'open', label: 'Abiertos', matches: isOpenFeedback },
    { id: 'mine', label: 'Míos', matches: (item) => item.createdBy === user.uid },
    { id: 'closed', label: 'Cerrados', matches: (item) => !isOpenFeedback(item) },
  ]
  const active = filters.find((entry) => entry.id === filter) ?? filters[0]
  const shown = items.filter(active.matches)
  const empty: Record<Filter, string> = {
    waiting: 'No hay comentarios nuevos.',
    open: 'No hay comentarios abiertos.',
    mine: 'Todavía no has enviado ningún comentario.',
    closed: 'No hay comentarios cerrados.',
  }

  return (
    <div className="kit-feedback-view">
      <p className="kit-hint">¿Algo no funciona o echas algo en falta en {appName}? Cuéntanoslo. Antes, mira si alguien ya lo ha propuesto.</p>
      <button className="kit-primary-button kit-feedback-new" type="button" onClick={onNew}><PlusIcon />Nuevo comentario</button>
      <div className="kit-feedback-filters" role="group" aria-label="Mostrar">
        {filters.map((entry) => (
          <button key={entry.id} className={`kit-chip${entry.id === active.id ? ' kit-chip-selected' : ''}`} type="button" aria-pressed={entry.id === active.id} onClick={() => onFilter(entry.id)}>
            {entry.label} <span className="kit-feedback-filter-count">{items.filter(entry.matches).length}</span>
          </button>
        ))}
      </div>
      {error && <p className="kit-error" role="alert">{error}</p>}
      {!ready && !error && <p className="kit-hint">Cargando comentarios…</p>}
      {ready && shown.length === 0 && <p className="kit-hint">{empty[active.id]}</p>}
      {shown.length > 0 && (
        <ul className="kit-feedback-list">
          {shown.map((item) => <li key={item.id}><FeedbackRow item={item} unread={hasUnreadReply(item, user.uid)} onOpen={onOpen} /></li>)}
        </ul>
      )}
    </div>
  )
}

function FeedbackRow({ item, unread, onOpen }: { item: FeedbackItem; unread: boolean; onOpen: (id: string) => void }) {
  return (
    <button className="kit-feedback-item" type="button" onClick={() => onOpen(item.id)}>
      <FeedbackBadges item={item} unread={unread} />
      <span className="kit-feedback-item-title">{item.title}</span>
      <span className="kit-feedback-meta">
        {feedbackAuthorName(item.createdByEmail)} · {item.sending ? 'Enviando…' : formatFeedbackDate(item.createdAt)}
        {item.reply ? ' · Con respuesta' : ''}
      </span>
    </button>
  )
}
