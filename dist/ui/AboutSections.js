import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { formatBuildTime } from '../utils/build.js';
import { EnvironmentPanel } from './EnvironmentPanel.js';
import { ExternalLinkIcon } from './icons.js';
export const DEFAULT_DEVELOPER = { name: 'luiz1919 en GitHub', url: 'https://github.com/luiz1919' };
function ExternalLink({ label, url }) {
    return _jsxs("a", { className: "kit-about-link", href: url, target: "_blank", rel: "noopener noreferrer", children: [label, _jsx(ExternalLinkIcon, {})] });
}
/**
 * The cards of "Acerca de", shared by AboutPage (a screen, `level` 2) and AboutButton (a dialog,
 * `level` 3): description, "Versión", "Entorno", "Tecnología", "Privacidad" and "Enlaces".
 */
export function AboutSections({ info, level }) {
    const { build, developer = DEFAULT_DEVELOPER, description, technology = [], privacy = [], privacyNote, links = [], disclaimer } = info;
    const id = useId();
    const Heading = level === 2 ? 'h2' : 'h3';
    return (_jsxs(_Fragment, { children: [description && _jsx("p", { className: "kit-about-description", children: description }), _jsxs("section", { className: "kit-about-card", "aria-labelledby": `${id}-version`, children: [_jsx(Heading, { id: `${id}-version`, children: "Versi\u00F3n" }), _jsxs("dl", { className: "kit-about-facts", children: [_jsx("dt", { children: "Versi\u00F3n" }), _jsx("dd", { children: build.version }), build.commit && _jsxs(_Fragment, { children: [_jsx("dt", { children: "Commit" }), _jsx("dd", { children: _jsx("code", { children: build.commit }) })] }), _jsx("dt", { children: "Compilaci\u00F3n" }), _jsx("dd", { children: build.buildTime ? _jsx("time", { dateTime: build.buildTime, children: formatBuildTime(build.buildTime) }) : formatBuildTime('') }), _jsx("dt", { children: "Desarrollador" }), _jsx("dd", { children: developer.url ? _jsx(ExternalLink, { label: developer.name, url: developer.url }) : developer.name })] })] }), info.environment && _jsx(EnvironmentPanel, { environment: info.environment, canSwitch: info.canSwitchEnvironment ?? false, testData: info.testData, level: level }), technology.length > 0 && (_jsxs("section", { className: "kit-about-card", "aria-labelledby": `${id}-technology`, children: [_jsx(Heading, { id: `${id}-technology`, children: "Tecnolog\u00EDa" }), _jsx("ul", { className: "kit-about-items", children: technology.map((item) => _jsx("li", { children: item }, item)) })] })), (privacy.length > 0 || privacyNote) && (_jsxs("section", { className: "kit-about-card", "aria-labelledby": `${id}-privacy`, children: [_jsx(Heading, { id: `${id}-privacy`, children: "Privacidad" }), privacyNote && _jsx("p", { className: "kit-notice kit-notice-warn", children: privacyNote }), privacy.length > 0 && _jsx("ul", { className: "kit-about-items", children: privacy.map((item) => _jsx("li", { children: item }, item)) })] })), (links.length > 0 || disclaimer) && (_jsxs("section", { className: "kit-about-card", "aria-labelledby": `${id}-links`, children: [_jsx(Heading, { id: `${id}-links`, children: "Enlaces" }), links.length > 0 && (_jsx("ul", { className: "kit-about-links", children: links.map((link) => (_jsx("li", { children: link.url ? _jsx(ExternalLink, { ...link }) : _jsxs("span", { children: [link.label, " ", _jsx("span", { className: "kit-badge", children: "Pr\u00F3ximamente" })] }) }, link.label))) })), disclaimer && _jsx("p", { className: "kit-hint", children: disclaimer })] }))] }));
}
