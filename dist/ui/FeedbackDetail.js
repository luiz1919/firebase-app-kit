import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useState } from 'react';
import { deleteFeedback, manageFeedback, markFeedbackReplyRead, readFeedbackDiagnostics, readFeedbackScreenshots } from '../feedback.js';
import { FEEDBACK_KIND_LABELS, FEEDBACK_LIMITS, FEEDBACK_STATUSES, FEEDBACK_STATUS_LABELS, feedbackAuthorName, feedbackContextEntries, feedbackToMarkdown, formatFeedbackDate, githubIssueUrl, hasUnreadReply, } from '../utils/feedback.js';
import { FeedbackBadges } from './FeedbackBadges.js';
import { writeErrorMessage } from './feedbackErrors.js';
import { CopyIcon, ExternalLinkIcon, PencilIcon, TrashIcon } from './icons.js';
export function FeedbackDetail({ db, user, isAdmin, appName, build, githubRepo, item, ready, notice, onEdit, onDeleted, onWriteError }) {
    const mine = item?.createdBy === user.uid;
    // Screenshots and details are only readable once the feedback is on the server.
    const canSeePrivate = Boolean(item) && (mine || isAdmin) && !item?.sending;
    const diagnostics = usePrivateDiagnostics(db, canSeePrivate && item?.hasDiagnostics ? item.id : null);
    const unread = item ? hasUnreadReply(item, user.uid) : false;
    const itemId = item?.id ?? '';
    useEffect(() => {
        if (unread && itemId)
            void markFeedbackReplyRead(db, itemId).catch(() => undefined);
    }, [db, itemId, unread]);
    if (!item)
        return _jsx("p", { className: "kit-hint", children: ready ? 'Este comentario ya no existe.' : 'Cargando…' });
    return (_jsxs("div", { className: "kit-feedback-view", children: [notice && _jsx("p", { className: "kit-notice kit-notice-ok", role: "status", children: notice }), _jsx(FeedbackBadges, { item: item }), _jsx("p", { className: "kit-feedback-text", children: item.text }), _jsxs("p", { className: "kit-feedback-meta", children: [FEEDBACK_KIND_LABELS[item.kind], " \u00B7 ", feedbackAuthorName(item.createdByEmail), " \u00B7 ", formatFeedbackDate(item.createdAt), item.appVersion && ` · v${item.appVersion}`, item.editedAt && ' · editado'] }), item.status === 'done' && item.resolvedVersion && (_jsxs("p", { className: "kit-notice kit-notice-ok", children: ["Resuelto en la versi\u00F3n ", item.resolvedVersion, build.version === item.resolvedVersion ? ' (la que estás usando)' : '', "."] })), item.reply && (_jsxs("section", { className: "kit-feedback-reply", "aria-label": "Respuesta", children: [_jsx("h3", { children: "Respuesta" }), _jsx("p", { className: "kit-feedback-text", children: item.reply }), item.repliedAt && _jsx("p", { className: "kit-feedback-meta", children: formatFeedbackDate(item.repliedAt) })] })), item.sending && _jsx("p", { className: "kit-hint", children: navigator.onLine ? 'Enviando…' : 'Sin conexión: se enviará cuando vuelva la conexión.' }), canSeePrivate && item.screenshotCount > 0 && _jsx(Screenshots, { db: db, id: item.id, count: item.screenshotCount }), canSeePrivate && item.hasDiagnostics && _jsx(Diagnostics, { diagnostics: diagnostics }), mine && (_jsx("div", { className: "kit-actions", children: _jsxs("button", { className: "kit-secondary-button", type: "button", onClick: onEdit, children: [_jsx(PencilIcon, {}), "Editar"] }) })), isAdmin && (_jsx(AdminPanel, { db: db, user: user, item: item, appName: appName, build: build, githubRepo: githubRepo, diagnostics: diagnostics.value, onDeleted: onDeleted, onWriteError: onWriteError }, item.id))] }));
}
function usePrivateDiagnostics(db, id) {
    const [state, setState] = useState({ id: '', value: null, error: '' });
    useEffect(() => {
        if (!id)
            return;
        let active = true;
        readFeedbackDiagnostics(db, id).then((value) => active && setState({ id, value, error: '' }), () => active && setState({ id, value: null, error: 'No se han podido cargar los datos técnicos.' }));
        return () => { active = false; };
    }, [db, id]);
    return state.id === id ? { value: state.value, error: state.error } : { value: null, error: '' };
}
function Screenshots({ db, id, count }) {
    const [urls, setUrls] = useState(null);
    const [error, setError] = useState('');
    const [zoomed, setZoomed] = useState(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        let created = [];
        readFeedbackScreenshots(db, { id, screenshotCount: count }).then((blobs) => {
            if (!active)
                return;
            created = blobs.map((blob) => URL.createObjectURL(blob));
            setUrls(created);
            if (blobs.length < count)
                setError('Alguna captura no se ha podido cargar.');
        }, () => active && setError('No se han podido cargar las capturas. Comprueba la conexión.'));
        return () => {
            active = false;
            for (const url of created)
                URL.revokeObjectURL(url);
        };
    }, [db, id, count, attempt]);
    return (_jsxs("section", { className: "kit-feedback-section", "aria-label": "Capturas", children: [_jsx("h3", { children: "Capturas" }), !urls && !error && _jsx("p", { className: "kit-hint", children: "Cargando capturas\u2026" }), error && (_jsxs("p", { className: "kit-hint", children: [error, ' ', _jsx("button", { className: "kit-link-button", type: "button", onClick: () => { setError(''); setUrls(null); setAttempt((value) => value + 1); }, children: "Reintentar" })] })), urls && zoomed !== null && urls[zoomed] && (_jsxs("figure", { className: "kit-feedback-zoom", children: [_jsx("img", { src: urls[zoomed], alt: `Captura ${zoomed + 1}` }), _jsx("figcaption", { children: _jsx("button", { className: "kit-link-button", type: "button", onClick: () => setZoomed(null), children: "Ver en peque\u00F1o" }) })] })), urls && urls.length > 0 && (_jsx("ul", { className: "kit-feedback-shots", children: urls.map((url, index) => (_jsx("li", { className: "kit-feedback-shot", children: _jsx("button", { className: "kit-feedback-shot-open", type: "button", onClick: () => setZoomed(index), "aria-label": `Ver la captura ${index + 1}`, "aria-pressed": zoomed === index, children: _jsx("img", { src: url, alt: "" }) }) }, url))) }))] }));
}
const timeOf = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleTimeString('es-ES');
};
function Diagnostics({ diagnostics }) {
    const { value, error } = diagnostics;
    return (_jsxs("details", { className: "kit-feedback-diagnostics", children: [_jsx("summary", { children: "Datos t\u00E9cnicos" }), error && _jsx("p", { className: "kit-hint", children: error }), !value && !error && _jsx("p", { className: "kit-hint", children: "Cargando\u2026" }), value && (_jsxs(_Fragment, { children: [_jsx("dl", { children: feedbackContextEntries(value.context).map(([label, text]) => _jsxs("div", { children: [_jsx("dt", { children: label }), _jsx("dd", { children: text })] }, label)) }), _jsx("p", { className: "kit-feedback-label", children: "\u00DAltimos errores" }), value.errors.length === 0
                        ? _jsx("p", { className: "kit-hint", children: "Ninguno." })
                        : _jsx("ol", { className: "kit-feedback-errors", children: value.errors.map((entry, index) => _jsxs("li", { children: [_jsx("time", { dateTime: entry.at, children: timeOf(entry.at) }), " ", entry.message] }, index)) })] }))] }));
}
function AdminPanel({ db, user, item, appName, build, githubRepo, diagnostics, onDeleted, onWriteError }) {
    const [status, setStatus] = useState(item.status);
    const [reply, setReply] = useState(item.reply);
    const [resolvedVersion, setResolvedVersion] = useState(item.resolvedVersion);
    const [message, setMessage] = useState('');
    const id = useId();
    const changed = status !== item.status || reply.trim() !== item.reply || resolvedVersion.trim() !== item.resolvedVersion;
    const report = { appName, diagnostics };
    function changeStatus(next) {
        setStatus(next);
        // "Resuelto" (done) suggests the version being used, which is usually the one with the fix.
        if (next === 'done' && !resolvedVersion.trim())
            setResolvedVersion(build.version);
    }
    function save(event) {
        event.preventDefault();
        if (!changed)
            return;
        manageFeedback(db, item, { status, reply, resolvedVersion: status === 'done' ? resolvedVersion : '' }, user.uid)
            .catch((saveError) => onWriteError(writeErrorMessage(saveError, 'guardar los cambios')));
        setMessage('Guardado.');
    }
    async function copy() {
        try {
            await navigator.clipboard.writeText(feedbackToMarkdown(item, report));
            setMessage('Copiado como Markdown.');
        }
        catch {
            setMessage('No se ha podido copiar.');
        }
    }
    function remove() {
        if (!window.confirm('¿Eliminar este comentario, con sus capturas y datos técnicos? No se puede deshacer.'))
            return;
        deleteFeedback(db, item).catch((deleteError) => onWriteError(writeErrorMessage(deleteError, 'eliminar el comentario')));
        onDeleted();
    }
    return (_jsxs("section", { className: "kit-feedback-admin", "aria-labelledby": `${id}-title`, children: [_jsx("h3", { id: `${id}-title`, children: "Gesti\u00F3n (administrador)" }), _jsxs("form", { className: "kit-feedback-form", onSubmit: save, children: [_jsxs("div", { className: "kit-field", children: [_jsx("label", { htmlFor: `${id}-status`, children: "Estado" }), _jsx("select", { id: `${id}-status`, className: "kit-input", value: status, onChange: (event) => changeStatus(event.target.value), children: FEEDBACK_STATUSES.map((option) => _jsx("option", { value: option, children: FEEDBACK_STATUS_LABELS[option] }, option)) })] }), status === 'done' && (_jsxs("div", { className: "kit-field", children: [_jsx("label", { htmlFor: `${id}-version`, children: "Resuelto en la versi\u00F3n" }), _jsx("input", { id: `${id}-version`, className: "kit-input", value: resolvedVersion, maxLength: FEEDBACK_LIMITS.version, placeholder: build.version, onChange: (event) => setResolvedVersion(event.target.value) })] })), _jsxs("div", { className: "kit-field", children: [_jsxs("label", { htmlFor: `${id}-reply`, children: ["Respuesta ", _jsx("span", { className: "kit-feedback-optional", children: "(la ver\u00E1 todo el mundo; al autor le aparecer\u00E1 como nueva)" })] }), _jsx("textarea", { id: `${id}-reply`, className: "kit-input kit-feedback-textarea", rows: 4, value: reply, maxLength: FEEDBACK_LIMITS.reply, onChange: (event) => setReply(event.target.value) })] }), _jsx("button", { className: "kit-primary-button", type: "submit", disabled: !changed, children: "Guardar" })] }), message && _jsx("p", { className: "kit-notice kit-notice-ok", role: "status", children: message }), _jsxs("div", { className: "kit-actions", children: [_jsxs("button", { className: "kit-secondary-button", type: "button", onClick: () => void copy(), children: [_jsx(CopyIcon, {}), "Copiar como Markdown"] }), githubRepo && (_jsxs("a", { className: "kit-secondary-button", href: githubIssueUrl(githubRepo, item, report), target: "_blank", rel: "noopener noreferrer", children: [_jsx(ExternalLinkIcon, { size: 16 }), "Crear issue en GitHub"] })), _jsxs("button", { className: "kit-link-button kit-link-danger", type: "button", onClick: remove, children: [_jsx(TrashIcon, {}), "Eliminar"] })] })] }));
}
