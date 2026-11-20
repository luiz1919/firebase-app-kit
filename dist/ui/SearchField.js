import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useRef } from 'react';
import { CloseIcon, SearchIcon } from './icons.js';
/**
 * Search box: a magnifier, and an × that clears it as soon as there is text, leaving the cursor in
 * the field. Escape clears it too. The browsers' own × is hidden: it is missing on some phones and
 * looks different on each, so every app gets the same one.
 */
export function SearchField({ value, onChange, placeholder = 'Buscar', label, id, autoFocus, className }) {
    const input = useRef(null);
    const generated = useId();
    const fieldId = id ?? generated;
    return (_jsxs("div", { className: `kit-search${className ? ` ${className}` : ''}`, children: [_jsx("label", { className: "kit-sr-only", htmlFor: fieldId, children: label ?? placeholder }), _jsx(SearchIcon, {}), _jsx("input", { id: fieldId, ref: input, className: "kit-input", type: "search", value: value, placeholder: placeholder, autoComplete: "off", autoFocus: autoFocus, enterKeyHint: "search", onChange: (event) => onChange(event.target.value), 
                // Only with text: with nothing to clear, Escape keeps closing the dialog or screen around.
                onKeyDown: (event) => {
                    if (event.key === 'Escape' && value) {
                        event.preventDefault();
                        onChange('');
                    }
                } }), value && (_jsx("button", { className: "kit-icon-button kit-search-clear", type: "button", "aria-label": "Borrar la b\u00FAsqueda", title: "Borrar", onClick: () => {
                    onChange('');
                    input.current?.focus();
                }, children: _jsx(CloseIcon, { size: 18 }) }))] }));
}
