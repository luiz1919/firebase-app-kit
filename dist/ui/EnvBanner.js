import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Orange band for the top of the page while the app uses the dev project ("Pruebas"), so test
 * data is never mistaken for real data. Renders nothing in production. While it is shown, the
 * --kit-env-banner-height CSS variable gives its height (for sticky headers: top: var(--kit-env-banner-height, 0)).
 */
export function EnvBanner({ environment }) {
    if (environment.current !== 'dev')
        return null;
    return (_jsxs("div", { className: "kit-env-banner", role: "note", children: [_jsx("strong", { children: "Pruebas" }), " \u00B7 estos datos no son reales"] }));
}
