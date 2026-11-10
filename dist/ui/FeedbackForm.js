import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useRef, useState } from 'react';
import { editFeedback, feedbackDraftProblem, submitFeedback } from '../feedback.js';
import { recentErrors } from '../utils/errorLog.js';
import { FEEDBACK_KINDS, FEEDBACK_KIND_LABELS, FEEDBACK_LIMITS, collectFeedbackContext, feedbackAuthorName, similarFeedback, } from '../utils/feedback.js';
import { imageToJpeg } from '../utils/image.js';
import { CloseIcon, ImagePlusIcon } from './icons.js';
import { EMPTY_DRAFT } from './feedbackDraft.js';
import { writeErrorMessage } from './feedbackErrors.js';
/** Longest side of a screenshot: phone screenshots stay readable and fit in one chunk. */
const SCREENSHOT_SIDE = 1600;
const PLACEHOLDERS = {
    bug: 'Qué estabas haciendo, qué esperabas que pasara y qué ha pasado.',
    idea: 'Qué te gustaría poder hacer y para qué te vendría bien.',
    other: 'Los detalles de tu comentario.',
};
const TITLE_LABELS = { bug: '¿Qué falla?', idea: '¿Qué propones?', other: 'Título' };
const TITLE_PLACEHOLDERS = {
    bug: 'En pocas palabras: «La lista no se guarda sin conexión»',
    idea: 'En pocas palabras: «Modo oscuro»',
    other: 'En pocas palabras',
};
export function FeedbackForm({ db, user, appName, build, draft, setDraft, editing, items, onOpen, onDone, onWriteError }) {
    const [edit, setEdit] = useState(() => ({ kind: editing?.kind ?? 'bug', title: editing?.title ?? '', text: editing?.text ?? '' }));
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const fileRef = useRef(null);
    const id = useId();
    const kind = editing ? edit.kind : draft.kind;
    const title = editing ? edit.title : draft.title;
    const text = editing ? edit.text : draft.text;
    const similar = editing ? [] : similarFeedback(`${title}\n${text}`, items);
    const room = FEEDBACK_LIMITS.screenshots - draft.screenshots.length;
    function setKind(next) {
        if (editing)
            setEdit((current) => ({ ...current, kind: next }));
        else
            setDraft((current) => ({ ...current, kind: next, includeDiagnostics: current.diagnosticsChosen ? current.includeDiagnostics : next === 'bug' }));
    }
    function setTitle(next) {
        if (editing)
            setEdit((current) => ({ ...current, title: next }));
        else
            setDraft((current) => ({ ...current, title: next }));
    }
    function setText(next) {
        if (editing)
            setEdit((current) => ({ ...current, text: next }));
        else
            setDraft((current) => ({ ...current, text: next }));
    }
    async function addScreenshots(event) {
        const input = event.currentTarget;
        const files = [...(input.files ?? [])];
        if (files.length === 0)
            return;
        setError('');
        setProcessing(true);
        try {
            for (const file of files.slice(0, Math.max(room, 0))) {
                const image = await imageToJpeg(file, { maxSide: SCREENSHOT_SIDE });
                const url = URL.createObjectURL(new Blob([image.bytes], { type: 'image/jpeg' }));
                setDraft((current) => ({ ...current, screenshots: [...current.screenshots, { image, url }].slice(0, FEEDBACK_LIMITS.screenshots) }));
            }
            if (files.length > room)
                setError(`Solo se pueden adjuntar ${FEEDBACK_LIMITS.screenshots} capturas.`);
        }
        catch (imageError) {
            setError(imageError instanceof Error ? imageError.message : 'No se ha podido procesar la imagen.');
        }
        finally {
            // Cleared after reading: on iOS clearing the <input> first can invalidate the files.
            input.value = '';
            setProcessing(false);
        }
    }
    function removeScreenshot(index) {
        setDraft((current) => {
            URL.revokeObjectURL(current.screenshots[index].url);
            return { ...current, screenshots: current.screenshots.filter((_, position) => position !== index) };
        });
    }
    function submit(event) {
        event.preventDefault();
        const problem = feedbackDraftProblem({ title, text }, editing ? 0 : draft.screenshots.length);
        if (problem) {
            setError(problem);
            return;
        }
        const savedLater = !navigator.onLine;
        try {
            if (editing) {
                editFeedback(db, editing.id, edit).catch((saveError) => onWriteError(writeErrorMessage(saveError, 'guardar el comentario')));
                onDone(editing.id, savedLater ? 'Cambios guardados en este dispositivo: se subirán al volver la conexión.' : 'Cambios guardados.');
                return;
            }
            const diagnostics = draft.includeDiagnostics ? { context: collectFeedbackContext(build), errors: recentErrors() } : null;
            const sent = submitFeedback(db, user, { kind, title, text, screenshots: draft.screenshots.map((entry) => entry.image), diagnostics }, build.version);
            sent.committed.catch((sendError) => onWriteError(writeErrorMessage(sendError, 'enviar el comentario')));
            for (const entry of draft.screenshots)
                URL.revokeObjectURL(entry.url);
            setDraft(EMPTY_DRAFT);
            onDone(sent.id, savedLater ? 'Guardado en este dispositivo: se enviará al volver la conexión.' : '¡Gracias! Comentario enviado.');
        }
        catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : 'No se ha podido enviar el comentario.');
        }
    }
    return (_jsxs("form", { className: "kit-feedback-view kit-feedback-form", onSubmit: submit, noValidate: true, children: [_jsxs("fieldset", { className: "kit-feedback-fieldset", children: [_jsx("legend", { children: "Tipo" }), _jsx("div", { className: "kit-feedback-kinds", children: FEEDBACK_KINDS.map((option) => (_jsxs("label", { className: `kit-chip kit-feedback-kind${option === kind ? ' kit-chip-selected' : ''}`, children: [_jsx("input", { className: "kit-sr-only", type: "radio", name: `${id}-kind`, value: option, checked: option === kind, onChange: () => setKind(option) }), FEEDBACK_KIND_LABELS[option]] }, option))) })] }), _jsxs("div", { className: "kit-field", children: [_jsx("label", { htmlFor: `${id}-title`, children: TITLE_LABELS[kind] }), _jsx("input", { id: `${id}-title`, className: "kit-input", value: title, maxLength: FEEDBACK_LIMITS.title, placeholder: TITLE_PLACEHOLDERS[kind], autoComplete: "off", onChange: (event) => setTitle(event.target.value) })] }), _jsxs("div", { className: "kit-field", children: [_jsxs("label", { htmlFor: `${id}-text`, children: ["Descripci\u00F3n ", _jsx("span", { className: "kit-feedback-optional", children: "(opcional)" })] }), _jsx("textarea", { id: `${id}-text`, className: "kit-input kit-feedback-textarea", value: text, maxLength: FEEDBACK_LIMITS.text, rows: 6, placeholder: PLACEHOLDERS[kind], onChange: (event) => setText(event.target.value) }), text.length > FEEDBACK_LIMITS.text - 300 && _jsxs("p", { className: "kit-hint", children: [FEEDBACK_LIMITS.text - text.length, " caracteres disponibles."] })] }), similar.length > 0 && (_jsxs("div", { className: "kit-notice kit-feedback-similar", children: [_jsx("p", { children: "\u00BFEs alguno de estos? Si ya est\u00E1, no hace falta repetirlo." }), _jsx("ul", { children: similar.map((item) => (_jsx("li", { children: _jsx("button", { className: "kit-link-button", type: "button", onClick: () => onOpen(item.id), children: item.title }) }, item.id))) })] })), !editing && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "kit-field", children: [_jsxs("span", { className: "kit-feedback-label", children: ["Capturas ", _jsxs("span", { className: "kit-feedback-optional", children: ["(opcional, hasta ", FEEDBACK_LIMITS.screenshots, ")"] })] }), draft.screenshots.length > 0 && (_jsx("ul", { className: "kit-feedback-shots", children: draft.screenshots.map((entry, index) => (_jsxs("li", { className: "kit-feedback-shot", children: [_jsx("img", { src: entry.url, alt: `Captura ${index + 1}` }), _jsx("button", { className: "kit-icon-button kit-feedback-shot-remove", type: "button", onClick: () => removeScreenshot(index), "aria-label": `Quitar la captura ${index + 1}`, title: "Quitar", children: _jsx(CloseIcon, { size: 16 }) })] }, entry.url))) })), room > 0 && (_jsxs("button", { className: "kit-secondary-button kit-feedback-add-shot", type: "button", disabled: processing, onClick: () => fileRef.current?.click(), children: [_jsx(ImagePlusIcon, {}), processing ? 'Preparando…' : 'Añadir captura'] })), _jsx("input", { ref: fileRef, className: "kit-sr-only", type: "file", accept: "image/*", multiple: true, tabIndex: -1, "aria-hidden": "true", onChange: (event) => void addScreenshots(event) })] }), _jsxs("label", { className: "kit-checkbox", children: [_jsx("input", { type: "checkbox", checked: draft.includeDiagnostics, onChange: (event) => {
                                    const checked = event.target.checked;
                                    setDraft((current) => ({ ...current, includeDiagnostics: checked, diagnosticsChosen: true }));
                                } }), _jsxs("span", { children: ["Incluir datos t\u00E9cnicos ", _jsx("span", { className: "kit-feedback-optional", children: "(versi\u00F3n, navegador, pantalla y \u00FAltimos errores: ayudan a encontrar el fallo)" })] })] })] })), _jsxs("p", { className: "kit-hint", children: ["Todos los usuarios de ", appName, " ver\u00E1n el t\u00EDtulo, la descripci\u00F3n y tu nombre (", feedbackAuthorName(user.email ?? ''), ").", !editing && ' Las capturas y los datos técnicos solo los verán tú y el administrador.'] }), error && _jsx("p", { className: "kit-error", role: "alert", children: error }), _jsx("button", { className: "kit-primary-button", type: "submit", disabled: processing, children: editing ? 'Guardar cambios' : 'Enviar' })] }));
}
