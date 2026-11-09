import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { SYNC_LABELS, syncDetail } from '../utils/sync.js';
import { CloseIcon, CloudAlertIcon, CloudCheckIcon, CloudOffIcon, CloudUploadIcon } from './icons.js';
import { useModalDialog } from './useModalDialog.js';
const ICONS = { synced: CloudCheckIcon, syncing: CloudUploadIcon, offline: CloudOffIcon, error: CloudAlertIcon };
/**
 * Cloud icon with the sync state; tapping it opens a centred modal dialog (like "Acerca de") with
 * the explanation and a close button, so it fits any screen. It follows the state while open.
 */
export function SyncStatus({ state, error, details, onDismissError }) {
    const { open, close, dialogProps } = useModalDialog();
    const titleId = useId();
    const label = SYNC_LABELS[state];
    const Icon = ICONS[state];
    return (_jsxs("div", { className: "kit-sync", children: [_jsx("button", { className: `kit-icon-button kit-sync-button kit-sync-${state}`, type: "button", title: label, "aria-label": `Estado de sincronización: ${label}`, "aria-haspopup": "dialog", onClick: open, children: _jsx(Icon, {}) }), _jsx("span", { className: "kit-sr-only", role: "status", children: label }), _jsxs("dialog", { className: "kit-dialog kit-sync-dialog", "aria-labelledby": titleId, ...dialogProps, children: [_jsxs("div", { className: "kit-dialog-heading", children: [_jsxs("h2", { id: titleId, children: [_jsx("span", { className: `kit-sync-icon kit-sync-${state}`, "aria-hidden": "true", children: _jsx(Icon, {}) }), label] }), _jsx("button", { className: "kit-icon-button", type: "button", autoFocus: true, onClick: close, "aria-label": "Cerrar el estado de sincronizaci\u00F3n", title: "Cerrar", children: _jsx(CloseIcon, {}) })] }), _jsx("p", { className: "kit-sync-text", children: syncDetail(state, details, error) }), state === 'error' && onDismissError && (_jsx("button", { className: "kit-secondary-button", type: "button", onClick: () => { onDismissError(); close(); }, children: "Entendido" }))] })] }));
}
