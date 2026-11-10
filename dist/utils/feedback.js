export const FEEDBACK_KINDS = ['bug', 'idea', 'other'];
/** Kind as the user picks it. */
export const FEEDBACK_KIND_LABELS = {
    bug: 'Algo no funciona',
    idea: 'Propuesta de mejora',
    other: 'Otro',
};
/** Kind in the badges of the list. */
export const FEEDBACK_KIND_BADGES = { bug: 'Fallo', idea: 'Mejora', other: 'Otro' };
export const FEEDBACK_STATUSES = ['new', 'in-progress', 'done', 'declined'];
export const FEEDBACK_STATUS_LABELS = {
    new: 'Nuevo',
    'in-progress': 'En curso',
    done: 'Resuelto',
    declined: 'Descartado',
};
/** Limits shared with the Firestore rules. */
export const FEEDBACK_LIMITS = { title: 120, text: 4000, reply: 4000, version: 40, screenshots: 3 };
const isKind = (value) => FEEDBACK_KINDS.includes(value);
const isStatus = (value) => FEEDBACK_STATUSES.includes(value);
const text = (value) => (typeof value === 'string' ? value : '');
/** Firestore Timestamp (anything with toDate()), Date or nothing. */
function dateOf(value) {
    if (value instanceof Date)
        return value;
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
        const date = value.toDate();
        return date instanceof Date ? date : null;
    }
    return null;
}
/**
 * Feedback sent before titles existed (v0.12.0) had only a text: its first line becomes the title
 * and the rest the description; a first line too long for a title is shortened and the whole text
 * stays as the description.
 */
export function splitUntitledFeedback(value) {
    const clean = cleanFeedbackText(value);
    const [first = '', ...rest] = clean.split('\n');
    const line = first.trim();
    if (line.length > FEEDBACK_LIMITS.title)
        return { title: feedbackTitle(line, FEEDBACK_LIMITS.title), text: clean };
    return { title: line, text: rest.join('\n').trim() };
}
/** Reads a feedback document defensively (unknown values fall back to safe defaults). */
export function feedbackFromData(id, data) {
    const count = Number(data.screenshotCount);
    const title = cleanFeedbackTitle(text(data.title));
    const content = title ? { title, text: text(data.text) } : splitUntitledFeedback(text(data.text));
    return {
        id,
        kind: isKind(data.kind) ? data.kind : 'other',
        title: content.title,
        text: content.text,
        status: isStatus(data.status) ? data.status : 'new',
        createdBy: text(data.createdBy),
        createdByEmail: text(data.createdByEmail),
        createdAt: dateOf(data.createdAt),
        editedAt: dateOf(data.editedAt),
        appVersion: text(data.appVersion),
        screenshotCount: Number.isInteger(count) ? Math.min(Math.max(count, 0), FEEDBACK_LIMITS.screenshots) : 0,
        hasDiagnostics: data.hasDiagnostics === true,
        reply: text(data.reply),
        repliedAt: dateOf(data.repliedAt),
        replyRead: data.replyRead !== false,
        resolvedVersion: text(data.resolvedVersion),
        sending: false,
    };
}
export const isOpenFeedback = (item) => item.status === 'new' || item.status === 'in-progress';
/** The author has a reply they have not seen yet. */
export const hasUnreadReply = (item, uid) => item.createdBy === uid && item.reply !== '' && !item.replyRead;
/** Name shown for an author: the part of the email before the @. */
export const feedbackAuthorName = (email) => email.split('@')[0] || 'Alguien';
/** First non-empty line, shortened to `max` characters. */
export function feedbackTitle(value, max = 90) {
    const line = value.split('\n').map((part) => part.trim()).find(Boolean) ?? '';
    return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
/** Text as it is stored: trimmed, with Windows line breaks and runs of blank lines tidied. */
export const cleanFeedbackText = (value) => value.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
/** Title as it is stored: one line, spaces collapsed, trimmed. */
export const cleanFeedbackTitle = (value) => value.replace(/\s+/g, ' ').trim();
/** Newest first; items still waiting for their server date go on top. */
export function sortFeedback(items) {
    const time = (item) => item.createdAt?.getTime() ?? Number.POSITIVE_INFINITY;
    return [...items].sort((first, second) => time(second) - time(first));
}
const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
/** "9 nov 2026", or "Ahora" while the server date is pending. */
export const formatFeedbackDate = (date) => (date ? dateFormatter.format(date) : 'Ahora');
// Words left out when looking for similar feedback.
const STOPWORDS = new Set([
    'que', 'los', 'las', 'una', 'uno', 'unos', 'unas', 'por', 'con', 'para', 'del', 'como', 'pero', 'cuando', 'esta', 'este',
    'esto', 'estos', 'estas', 'eso', 'ese', 'esa', 'hay', 'muy', 'mas', 'sin', 'sobre', 'tambien', 'porque', 'algo', 'nada',
    'cada', 'todo', 'toda', 'todos', 'todas', 'tengo', 'tiene', 'puedo', 'puede', 'quiero', 'seria', 'estaria', 'gustaria',
    'poder', 'hacer', 'cosa', 'veces', 'siempre', 'nunca', 'ahora', 'despues', 'antes', 'entonces', 'donde', 'aqui', 'alli',
    'app', 'aplicacion', 'the', 'and', 'for', 'with', 'not', 'that', 'this',
]);
/** Normalised word stems of a text (case, accents and common words ignored; 5-letter stems). */
export function feedbackWords(value) {
    const words = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
    return new Set(words.map((word) => word.slice(0, 5)));
}
/**
 * Feedback that looks like `value` (shared words with its title and description), most similar
 * first, to avoid repeating a suggestion. Needs at least two words in common, or one when the text
 * has a single word.
 */
export function similarFeedback(value, items, { excludeId, limit = 3 } = {}) {
    const words = feedbackWords(value);
    if (words.size === 0)
        return [];
    const needed = words.size === 1 ? 1 : 2;
    return items
        .filter((item) => item.id !== excludeId)
        .map((item) => {
        const other = feedbackWords(`${item.title}\n${item.text}`);
        let shared = 0;
        for (const word of words)
            if (other.has(word))
                shared += 1;
        return { item, shared };
    })
        .filter(({ shared }) => shared >= needed)
        .sort((first, second) => second.shared - first.shared || Number(isOpenFeedback(second.item)) - Number(isOpenFeedback(first.item)))
        .slice(0, limit)
        .map(({ item }) => item);
}
/** Labels of the technical details, in the order they are shown. */
export const FEEDBACK_CONTEXT_LABELS = {
    version: 'Versión',
    commit: 'Commit',
    buildTime: 'Compilación',
    route: 'Pantalla de la app',
    userAgent: 'Navegador',
    language: 'Idioma',
    timeZone: 'Zona horaria',
    viewport: 'Ventana',
    screen: 'Pantalla',
    online: 'Con conexión',
    standalone: 'App instalada',
    serviceWorker: 'Service worker activo',
};
/** Technical details of this device and build, for a bug report. Browser only (empty values in Node). */
export function collectFeedbackContext(build) {
    const browser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
    if (!browser)
        return { version: build.version, commit: build.commit, buildTime: build.buildTime };
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches === true
        || navigator.standalone === true;
    return {
        version: build.version,
        commit: build.commit,
        buildTime: build.buildTime,
        route: window.location.hash || window.location.pathname,
        userAgent: navigator.userAgent,
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        screen: `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio}`,
        online: navigator.onLine,
        standalone,
        serviceWorker: Boolean(navigator.serviceWorker?.controller),
    };
}
const contextValue = (value) => (typeof value === 'boolean' ? (value ? 'sí' : 'no') : String(value));
/** Technical details as [label, value] pairs: known keys first, in order, then any others. */
export function feedbackContextEntries(context) {
    const known = Object.keys(FEEDBACK_CONTEXT_LABELS).filter((key) => key in context);
    const others = Object.keys(context).filter((key) => !(key in FEEDBACK_CONTEXT_LABELS)).sort();
    return [...known, ...others]
        .filter((key) => context[key] !== '')
        .map((key) => [FEEDBACK_CONTEXT_LABELS[key] ?? key, contextValue(context[key])]);
}
function reportBody(item, { appName, diagnostics }, maxText) {
    const body = item.text.length > maxText ? `${item.text.slice(0, maxText)}…` : item.text;
    const lines = [
        ...(body ? [body, ''] : []),
        `- App: ${appName}${item.appVersion ? ` v${item.appVersion}` : ''}`,
        `- Kind: ${FEEDBACK_KIND_LABELS[item.kind]} (${item.kind})`,
        `- Status: ${FEEDBACK_STATUS_LABELS[item.status]} (${item.status})`,
        `- Author: ${feedbackAuthorName(item.createdByEmail)}, ${formatFeedbackDate(item.createdAt)}`,
        `- Firestore: feedback/${item.id}`,
    ];
    if (item.screenshotCount > 0)
        lines.push(`- Screenshots: ${item.screenshotCount} (in the app)`);
    if (item.reply)
        lines.push('', '### Reply', '', item.reply);
    if (diagnostics) {
        lines.push('', '### Technical details', '');
        for (const [label, value] of feedbackContextEntries(diagnostics.context))
            lines.push(`- ${label}: ${value}`);
        if (diagnostics.errors.length > 0) {
            lines.push('', '### Recent errors', '', '```');
            for (const entry of diagnostics.errors)
                lines.push(`${entry.at} ${entry.message}`);
            lines.push('```');
        }
    }
    return lines.join('\n');
}
/** The feedback as Markdown, to paste into an issue or a chat. */
export function feedbackToMarkdown(item, options) {
    return `## ${item.title}\n\n${reportBody(item, options, Number.POSITIVE_INFINITY)}`;
}
/** Browsers and GitHub handle URLs up to about 8000 characters. */
const MAX_ISSUE_URL = 7500;
/**
 * Link to a new GitHub issue with the title, body and label filled in (no token needed: the admin
 * reviews and submits it on GitHub). `repo` is "owner/name". Long texts are cut to fit the URL.
 */
export function githubIssueUrl(repo, item, options) {
    const title = item.title;
    const label = item.kind === 'bug' ? 'bug' : item.kind === 'idea' ? 'enhancement' : '';
    const urlFor = (variant, maxText) => {
        const params = new URLSearchParams({ title, body: reportBody(item, variant, maxText) });
        if (label)
            params.set('labels', label);
        return `https://github.com/${repo}/issues/new?${params}`;
    };
    // Too long: first without the recent errors, then without technical details, then a shorter text.
    const variants = [options];
    if (options.diagnostics) {
        variants.push({ ...options, diagnostics: { ...options.diagnostics, errors: [] } }, { ...options, diagnostics: null });
    }
    for (const variant of variants) {
        const url = urlFor(variant, item.text.length);
        if (url.length <= MAX_ISSUE_URL)
            return url;
    }
    const shortest = variants[variants.length - 1];
    let maxText = item.text.length;
    while (maxText > 0) {
        maxText = Math.floor(maxText * 0.8);
        const url = urlFor(shortest, maxText);
        if (url.length <= MAX_ISSUE_URL)
            return url;
    }
    return urlFor(shortest, 0);
}
