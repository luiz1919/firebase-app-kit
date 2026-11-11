import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { AboutSections } from './AboutSections.js';
import { ArrowLeftIcon } from './icons.js';
/**
 * "Acerca de" (About) as a screen, opened from the app's "Ajustes" (Settings): the app's icon,
 * name and tagline, then the cards (see AboutInfo). Its <h1> (class kit-about-title) takes
 * tabIndex -1, so the app can move the focus to it after navigating.
 */
export function AboutPage({ back, ...info }) {
    const titleId = useId();
    return (_jsxs("section", { className: "kit-about kit-about-page", "aria-labelledby": titleId, children: [back && (back.href
                ? _jsxs("a", { className: "kit-about-back", href: back.href, children: [_jsx(ArrowLeftIcon, { size: 18 }), back.label] })
                : _jsxs("button", { className: "kit-about-back", type: "button", onClick: back.onClick, children: [_jsx(ArrowLeftIcon, { size: 18 }), back.label] })), _jsxs("div", { className: "kit-about-hero", children: [info.icon && _jsx("img", { src: info.icon, width: "64", height: "64", alt: "" }), _jsxs("div", { children: [_jsx("h1", { id: titleId, className: "kit-about-title", tabIndex: -1, children: info.appName }), info.tagline && _jsx("p", { className: "kit-about-tagline", children: info.tagline })] })] }), _jsx(AboutSections, { info: info, level: 2 })] }));
}
