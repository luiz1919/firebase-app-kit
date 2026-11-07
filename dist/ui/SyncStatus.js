import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { usePopover } from "../react/popover.js";
import { SYNC_LABELS, syncDetail } from "../utils/sync.js";
import { CloudAlertIcon, CloudCheckIcon, CloudOffIcon, CloudUploadIcon } from "./icons.js";
const ICONS = { synced: CloudCheckIcon, syncing: CloudUploadIcon, offline: CloudOffIcon, error: CloudAlertIcon };
/**
 * Cloud icon with the sync state; tapping it opens a panel with the explanation. The panel is
 * positioned against the component's own wrapper (position: relative).
 */
export function SyncStatus({ state, error, details, onDismissError }) {
    const { open, toggle, close, buttonRef, panelRef, panelId } = usePopover();
    const label = SYNC_LABELS[state];
    const Icon = ICONS[state];
    return (_jsxs("div", { className: "kit-sync", children: [_jsx("button", { ref: buttonRef, className: `kit-icon-button kit-sync-button kit-sync-${state}`, type: "button", title: label, "aria-label": `Estado de sincronización: ${label}`, "aria-expanded": open, "aria-controls": panelId, onClick: toggle, children: _jsx(Icon, {}) }), _jsx("span", { className: "kit-sr-only", role: "status", children: label }), open && (_jsxs("div", { ref: panelRef, className: "kit-sync-details", id: panelId, role: "region", "aria-label": "Detalle de sincronizaci\u00F3n", children: [_jsx("strong", { children: label }), _jsx("p", { children: syncDetail(state, details, error) }), state === 'error' && onDismissError && (_jsx("button", { className: "kit-secondary-button", type: "button", onClick: () => { onDismissError(); close(); }, children: "Entendido" }))] }))] }));
}
