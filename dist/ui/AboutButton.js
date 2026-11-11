import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { AboutSections } from './AboutSections.js';
import { CloseIcon, InfoIcon } from './icons.js';
import { useModalDialog } from './useModalDialog.js';
/**
 * Info icon button (40 px, for a header, e.g. the sign-in screen's) that opens "Acerca de"
 * (About) in a modal dialog, with the same cards as AboutPage. Inside the app, prefer AboutPage
 * in "Ajustes" (Settings).
 */
export function AboutButton(info) {
    const { open, close, dialogProps } = useModalDialog();
    const titleId = useId();
    return (_jsxs(_Fragment, { children: [_jsx("button", { className: "kit-icon-button kit-about-button", type: "button", "aria-haspopup": "dialog", onClick: open, "aria-label": `Acerca de ${info.appName}`, title: "Acerca de", children: _jsx(InfoIcon, { size: 20 }) }), _jsxs("dialog", { className: "kit-dialog kit-about-dialog", "aria-labelledby": titleId, ...dialogProps, children: [_jsxs("div", { className: "kit-dialog-heading", children: [_jsxs("h2", { id: titleId, children: ["Acerca de ", info.appName] }), _jsx("button", { className: "kit-icon-button", type: "button", autoFocus: true, onClick: close, "aria-label": "Cerrar Acerca de", title: "Cerrar", children: _jsx(CloseIcon, {}) })] }), _jsxs("div", { className: "kit-about", children: [(info.icon || info.tagline) && (_jsxs("div", { className: "kit-about-hero kit-about-hero-small", children: [info.icon && _jsx("img", { src: info.icon, width: "48", height: "48", alt: "" }), info.tagline && _jsx("p", { className: "kit-about-tagline", children: info.tagline })] })), _jsx(AboutSections, { info: info, level: 3 })] })] })] }));
}
