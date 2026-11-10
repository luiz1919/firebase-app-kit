import { createElement as _createElement } from "react";
import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useFeedbackAdmin, useFeedbackBadge, useFeedbackList } from '../react/feedback.js';
import { installErrorLog } from '../utils/errorLog.js';
import { feedbackAuthorName, formatFeedbackDate, hasUnreadReply, isOpenFeedback } from '../utils/feedback.js';
import { FeedbackBadges } from './FeedbackBadges.js';
import { FeedbackDetail } from './FeedbackDetail.js';
import { FeedbackForm } from './FeedbackForm.js';
import { EMPTY_DRAFT } from './feedbackDraft.js';
import { ArrowLeftIcon, CloseIcon, MessageIcon, PlusIcon } from './icons.js';
import { useModalDialog } from './useModalDialog.js';
const VIEW_TITLES = { list: 'Comentarios', new: 'Nuevo comentario', edit: 'Editar comentario', detail: 'Comentario' };
/**
 * Feedback icon (for the app header, next to the sync status) that opens a modal dialog: the
 * app's feedback (open, mine, closed), a form for new feedback with screenshots and technical
 * details, and each item with its status and reply. Admins (admins/{uid} in Firestore) see a
 * count of new items and manage them. The draft survives closing the dialog.
 */
export function FeedbackButton({ db, user, appName, build, githubRepo }) {
    const isAdmin = useFeedbackAdmin(db, user.uid);
    const { unreadReplies, waiting } = useFeedbackBadge(db, user.uid, isAdmin);
    const { open, close, dialogProps } = useModalDialog();
    const [isOpen, setOpen] = useState(false);
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [writeError, setWriteError] = useState('');
    const titleId = useId();
    useEffect(() => installErrorLog(), []);
    if (!db)
        return null;
    const count = unreadReplies + waiting;
    const countLabel = [
        waiting > 0 ? `${waiting} ${waiting === 1 ? 'nuevo' : 'nuevos'}` : '',
        unreadReplies > 0 ? `${unreadReplies} ${unreadReplies === 1 ? 'respuesta sin leer' : 'respuestas sin leer'}` : '',
    ].filter(Boolean).join(', ');
    function show() {
        setOpen(true);
        open();
    }
    return (_jsxs("div", { className: "kit-feedback", children: [_jsxs("button", { className: "kit-icon-button kit-feedback-button", type: "button", title: "Comentarios", "aria-label": countLabel ? `Comentarios: ${countLabel}` : 'Comentarios', "aria-haspopup": "dialog", onClick: show, children: [_jsx(MessageIcon, {}), count > 0 && _jsx("span", { className: "kit-feedback-count", "aria-hidden": "true", children: count > 9 ? '9+' : count })] }), _jsx("dialog", { className: "kit-dialog kit-feedback-dialog", "aria-labelledby": titleId, ...dialogProps, onClose: () => setOpen(false), children: isOpen && (_jsx(FeedbackPanel, { db: db, user: user, isAdmin: isAdmin, appName: appName, build: build, githubRepo: githubRepo, draft: draft, setDraft: setDraft, writeError: writeError, setWriteError: setWriteError, initialFilter: isAdmin && waiting > 0 ? 'waiting' : unreadReplies > 0 ? 'mine' : 'open', titleId: titleId, onClose: close })) })] }));
}
function FeedbackPanel(props) {
    const { db, initialFilter, titleId, onClose, writeError, setWriteError } = props;
    const { items, ready, error } = useFeedbackList(db);
    const [views, setViews] = useState([{ name: 'list' }]);
    const [filter, setFilter] = useState(initialFilter);
    const headingRef = useRef(null);
    const view = views[views.length - 1];
    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        // A new view starts at the top of the dialog, with the focus on its title.
        headingRef.current?.closest('dialog')?.scrollTo(0, 0);
        headingRef.current?.focus();
    }, [views]);
    const go = useCallback((next) => setViews((current) => [...current, next]), []);
    const back = useCallback(() => setViews((current) => (current.length > 1 ? current.slice(0, -1) : current)), []);
    /** Replaces the whole history (after sending or deleting, "back" goes to the list). */
    const reset = useCallback((next) => setViews(next.name === 'list' ? [next] : [{ name: 'list' }, next]), []);
    const find = (id) => items.find((item) => item.id === id) ?? null;
    function content() {
        const editing = view.name === 'edit' ? find(view.id) : null;
        if (view.name === 'list') {
            return (_jsx(FeedbackList, { ...props, items: items, ready: ready, error: error, filter: filter, onFilter: setFilter, onNew: () => go({ name: 'new' }), onOpen: (id) => go({ name: 'detail', id }) }));
        }
        if (view.name === 'new' || editing) {
            return (_createElement(FeedbackForm, { ...props, key: editing ? editing.id : 'new', editing: editing, items: items, onOpen: (id) => go({ name: 'detail', id }), onDone: (id, notice) => reset({ name: 'detail', id, notice }), onWriteError: setWriteError }));
        }
        // A detail, or an edit whose item was deleted meanwhile (the detail says so).
        return (_createElement(FeedbackDetail, { ...props, key: view.id, item: find(view.id), ready: ready, notice: view.name === 'detail' ? view.notice : undefined, onEdit: () => go({ name: 'edit', id: view.id }), onDeleted: () => reset({ name: 'list' }), onWriteError: setWriteError }));
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "kit-dialog-heading kit-feedback-heading", children: [views.length > 1 && (_jsx("button", { className: "kit-icon-button kit-feedback-back", type: "button", onClick: back, "aria-label": "Volver", title: "Volver", children: _jsx(ArrowLeftIcon, {}) })), _jsx("h2", { id: titleId, ref: headingRef, tabIndex: -1, children: VIEW_TITLES[view.name] }), _jsx("button", { className: "kit-icon-button", type: "button", autoFocus: true, onClick: onClose, "aria-label": "Cerrar los comentarios", title: "Cerrar", children: _jsx(CloseIcon, {}) })] }), writeError && (_jsxs("div", { className: "kit-notice kit-notice-error kit-feedback-banner", role: "alert", children: [_jsx("span", { children: writeError }), _jsx("button", { className: "kit-link-button", type: "button", onClick: () => setWriteError(''), children: "Entendido" })] })), content()] }));
}
function FeedbackList({ items, ready, error, filter, onFilter, onNew, onOpen, user, isAdmin, appName }) {
    const filters = [
        ...(isAdmin ? [{ id: 'waiting', label: 'Nuevos', matches: (item) => item.status === 'new' }] : []),
        { id: 'open', label: 'Abiertos', matches: isOpenFeedback },
        { id: 'mine', label: 'Míos', matches: (item) => item.createdBy === user.uid },
        { id: 'closed', label: 'Cerrados', matches: (item) => !isOpenFeedback(item) },
    ];
    const active = filters.find((entry) => entry.id === filter) ?? filters[0];
    const shown = items.filter(active.matches);
    const empty = {
        waiting: 'No hay comentarios nuevos.',
        open: 'No hay comentarios abiertos.',
        mine: 'Todavía no has enviado ningún comentario.',
        closed: 'No hay comentarios cerrados.',
    };
    return (_jsxs("div", { className: "kit-feedback-view", children: [_jsxs("p", { className: "kit-hint", children: ["\u00BFAlgo no funciona o echas algo en falta en ", appName, "? Cu\u00E9ntanoslo. Antes, mira si alguien ya lo ha propuesto."] }), _jsxs("button", { className: "kit-primary-button kit-feedback-new", type: "button", onClick: onNew, children: [_jsx(PlusIcon, {}), "Nuevo comentario"] }), _jsx("div", { className: "kit-feedback-filters", role: "group", "aria-label": "Mostrar", children: filters.map((entry) => (_jsxs("button", { className: `kit-chip${entry.id === active.id ? ' kit-chip-selected' : ''}`, type: "button", "aria-pressed": entry.id === active.id, onClick: () => onFilter(entry.id), children: [entry.label, " ", _jsx("span", { className: "kit-feedback-filter-count", children: items.filter(entry.matches).length })] }, entry.id))) }), error && _jsx("p", { className: "kit-error", role: "alert", children: error }), !ready && !error && _jsx("p", { className: "kit-hint", children: "Cargando comentarios\u2026" }), ready && shown.length === 0 && _jsx("p", { className: "kit-hint", children: empty[active.id] }), shown.length > 0 && (_jsx("ul", { className: "kit-feedback-list", children: shown.map((item) => _jsx("li", { children: _jsx(FeedbackRow, { item: item, unread: hasUnreadReply(item, user.uid), onOpen: onOpen }) }, item.id)) }))] }));
}
function FeedbackRow({ item, unread, onOpen }) {
    return (_jsxs("button", { className: "kit-feedback-item", type: "button", onClick: () => onOpen(item.id), children: [_jsx(FeedbackBadges, { item: item, unread: unread }), _jsx("span", { className: "kit-feedback-item-title", children: item.title }), _jsxs("span", { className: "kit-feedback-meta", children: [feedbackAuthorName(item.createdByEmail), " \u00B7 ", item.sending ? 'Enviando…' : formatFeedbackDate(item.createdAt), item.reply ? ' · Con respuesta' : ''] })] }));
}
