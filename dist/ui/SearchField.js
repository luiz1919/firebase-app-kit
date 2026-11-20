import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useImperativeHandle, useRef } from 'react';
import { CloseIcon, SearchIcon } from './icons.js';
/**
 * Search box: a magnifier, and an × that clears it as soon as there is text, leaving the cursor in
 * the field. Escape clears it too. The browsers' own × is hidden: it is missing on some phones and
 * looks different on each, so every app gets the same one. Any other attribute of an <input>
 * (`lang`, `maxLength`, `spellCheck`, `autoCapitalize`, `name`, `required`, `onKeyDown`...) goes to
 * the input; a box inside a <form> submits it with Enter like any other field.
 */
export function SearchField({ value, onChange, placeholder = 'Buscar', label, id, className, inputRef, onKeyDown, ...inputProps }) {
    const input = useRef(null);
    useImperativeHandle(inputRef, () => input.current);
    const generated = useId();
    const fieldId = id ?? generated;
    return (_jsxs("div", { className: `kit-search${className ? ` ${className}` : ''}`, children: [_jsx("label", { className: "kit-sr-only", htmlFor: fieldId, children: label ?? placeholder }), _jsx(SearchIcon, {}), _jsx("input", { autoComplete: "off", enterKeyHint: "search", ...inputProps, id: fieldId, ref: input, className: "kit-input", type: "search", value: value, placeholder: placeholder, onChange: (event) => onChange(event.target.value), onKeyDown: (event) => {
                    onKeyDown?.(event);
                    // Only with text: with nothing to clear, Escape keeps closing the dialog or screen around.
                    if (event.key === 'Escape' && value && !event.defaultPrevented) {
                        event.preventDefault();
                        onChange('');
                    }
                } }), value && (_jsx("button", { className: "kit-icon-button kit-search-clear", type: "button", "aria-label": "Borrar la b\u00FAsqueda", title: "Borrar", onClick: () => {
                    onChange('');
                    input.current?.focus();
                }, children: _jsx(CloseIcon, { size: 18 }) }))] }));
}
