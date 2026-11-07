import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useId, useRef } from 'react';
import { formatBuildTime } from "../utils/build.js";
import { CloseIcon, ExternalLinkIcon, InfoIcon } from "./icons.js";
const DEFAULT_DEVELOPER = { name: 'luiz1919 en GitHub', url: 'https://github.com/luiz1919' };
/** "Acerca de" (About) link that opens a modal dialog with the version, commit, build date and developer. */
export function AboutButton({ appName, build, developer = DEFAULT_DEVELOPER }) {
    const dialog = useRef(null);
    const titleId = useId();
    return (_jsxs(_Fragment, { children: [_jsxs("button", { className: "kit-about-button", type: "button", "aria-haspopup": "dialog", onClick: () => dialog.current?.showModal(), children: [_jsx(InfoIcon, {}), "Acerca de"] }), _jsxs("dialog", { className: "kit-about-dialog", ref: dialog, "aria-labelledby": titleId, onKeyDown: event => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        dialog.current?.close();
                    }
                }, 
                // A tap on the backdrop (outside the dialog box) closes it.
                onClick: event => { if (event.target === dialog.current)
                    dialog.current.close(); }, children: [_jsxs("div", { className: "kit-about-heading", children: [_jsxs("h2", { id: titleId, children: ["Acerca de ", appName] }), _jsx("button", { className: "kit-icon-button", type: "button", autoFocus: true, onClick: () => dialog.current?.close(), "aria-label": "Cerrar Acerca de", title: "Cerrar", children: _jsx(CloseIcon, {}) })] }), _jsxs("dl", { className: "kit-about-list", children: [_jsx("dt", { children: "Versi\u00F3n" }), _jsx("dd", { children: build.version }), build.commit && _jsxs(_Fragment, { children: [_jsx("dt", { children: "Commit" }), _jsx("dd", { children: _jsx("code", { children: build.commit }) })] }), _jsx("dt", { children: "\u00DAltima compilaci\u00F3n" }), _jsx("dd", { children: build.buildTime ? _jsx("time", { dateTime: build.buildTime, children: formatBuildTime(build.buildTime) }) : formatBuildTime('') }), _jsx("dt", { children: "Desarrollador" }), _jsx("dd", { children: _jsxs("a", { href: developer.url, target: "_blank", rel: "noopener noreferrer", children: [developer.name, _jsx(ExternalLinkIcon, {})] }) })] })] })] }));
}
