import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Icons from Lucide (https://lucide.dev, ISC license), inlined so the kit and the apps do not
// need an icon library.
function Icon({ size, children }) {
    return (_jsx("svg", { className: "kit-icon", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false", children: children }));
}
export const InfoIcon = ({ size = 16 }) => (_jsxs(Icon, { size: size, children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M12 16v-4" }), _jsx("path", { d: "M12 8h.01" })] }));
export const CloseIcon = ({ size = 20 }) => (_jsxs(Icon, { size: size, children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }));
export const ExternalLinkIcon = ({ size = 14 }) => (_jsxs(Icon, { size: size, children: [_jsx("path", { d: "M15 3h6v6" }), _jsx("path", { d: "M10 14 21 3" }), _jsx("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" })] }));
export const LogInIcon = ({ size = 18 }) => (_jsxs(Icon, { size: size, children: [_jsx("path", { d: "m10 17 5-5-5-5" }), _jsx("path", { d: "M15 12H3" }), _jsx("path", { d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" })] }));
export const EyeIcon = ({ size = 18 }) => (_jsxs(Icon, { size: size, children: [_jsx("path", { d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
export const EyeOffIcon = ({ size = 18 }) => (_jsxs(Icon, { size: size, children: [_jsx("path", { d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" }), _jsx("path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242" }), _jsx("path", { d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" }), _jsx("path", { d: "m2 2 20 20" })] }));
export const CloudCheckIcon = ({ size = 23 }) => (_jsxs(Icon, { size: size, children: [_jsx("path", { d: "m17 15-5.5 5.5L9 18" }), _jsx("path", { d: "M5.516 16.07A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 3.501 7.327" })] }));
export const CloudUploadIcon = ({ size = 23 }) => (_jsxs(Icon, { size: size, children: [_jsx("path", { d: "M12 13v8" }), _jsx("path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }), _jsx("path", { d: "m8 17 4-4 4 4" })] }));
export const CloudOffIcon = ({ size = 23 }) => (_jsxs(Icon, { size: size, children: [_jsx("path", { d: "M10.94 5.274A7 7 0 0 1 15.71 10h1.79a4.5 4.5 0 0 1 4.222 6.057" }), _jsx("path", { d: "M18.796 18.81A4.5 4.5 0 0 1 17.5 19H9A7 7 0 0 1 5.79 5.78" }), _jsx("path", { d: "m2 2 20 20" })] }));
export const CloudAlertIcon = ({ size = 23 }) => (_jsxs(Icon, { size: size, children: [_jsx("path", { d: "M12 12v4" }), _jsx("path", { d: "M12 20h.01" }), _jsx("path", { d: "M8.128 16.949A7 7 0 1 1 15.71 8h1.79a1 1 0 0 1 0 9h-1.642" })] }));
