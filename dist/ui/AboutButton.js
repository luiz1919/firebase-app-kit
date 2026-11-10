import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { formatBuildTime } from '../utils/build.js';
import { EnvironmentPanel } from './EnvironmentPanel.js';
import { CloseIcon, ExternalLinkIcon, InfoIcon } from './icons.js';
import { useModalDialog } from './useModalDialog.js';
const DEFAULT_DEVELOPER = { name: 'luiz1919 en GitHub', url: 'https://github.com/luiz1919' };
/**
 * "Acerca de" (About) link that opens a modal dialog with the version, commit, build date and
 * developer and, with `environment`, the Real / Pruebas switch and the test data tools.
 */
export function AboutButton({ appName, build, developer = DEFAULT_DEVELOPER, environment, canSwitchEnvironment = false, testData }) {
    const { open, close, dialogProps } = useModalDialog();
    const titleId = useId();
    return (_jsxs(_Fragment, { children: [_jsxs("button", { className: "kit-about-button", type: "button", "aria-haspopup": "dialog", onClick: open, children: [_jsx(InfoIcon, {}), "Acerca de"] }), _jsxs("dialog", { className: "kit-dialog kit-about-dialog", "aria-labelledby": titleId, ...dialogProps, children: [_jsxs("div", { className: "kit-dialog-heading kit-about-heading", children: [_jsxs("h2", { id: titleId, children: ["Acerca de ", appName] }), _jsx("button", { className: "kit-icon-button", type: "button", autoFocus: true, onClick: close, "aria-label": "Cerrar Acerca de", title: "Cerrar", children: _jsx(CloseIcon, {}) })] }), _jsxs("dl", { className: "kit-about-list", children: [_jsx("dt", { children: "Versi\u00F3n" }), _jsx("dd", { children: build.version }), build.commit && _jsxs(_Fragment, { children: [_jsx("dt", { children: "Commit" }), _jsx("dd", { children: _jsx("code", { children: build.commit }) })] }), _jsx("dt", { children: "\u00DAltima compilaci\u00F3n" }), _jsx("dd", { children: build.buildTime ? _jsx("time", { dateTime: build.buildTime, children: formatBuildTime(build.buildTime) }) : formatBuildTime('') }), _jsx("dt", { children: "Desarrollador" }), _jsx("dd", { children: _jsxs("a", { href: developer.url, target: "_blank", rel: "noopener noreferrer", children: [developer.name, _jsx(ExternalLinkIcon, {})] }) })] }), environment && _jsx(EnvironmentPanel, { environment: environment, canSwitch: canSwitchEnvironment, testData: testData })] })] }));
}
