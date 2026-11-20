import type { InputHTMLAttributes, Ref } from 'react';
export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'id' | 'className' | 'placeholder'> {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Accessible name; the placeholder when omitted. */
    label?: string;
    id?: string;
    /** Class of the wrapper (the box with the magnifier and the ×). */
    className?: string;
    /** The <input>, to focus it (a shortcut key, after a result...). */
    inputRef?: Ref<HTMLInputElement>;
}
/**
 * Search box: a magnifier, and an × that clears it as soon as there is text, leaving the cursor in
 * the field. Escape clears it too. The browsers' own × is hidden: it is missing on some phones and
 * looks different on each, so every app gets the same one. Any other attribute of an <input>
 * (`lang`, `maxLength`, `spellCheck`, `autoCapitalize`, `name`, `required`, `onKeyDown`...) goes to
 * the input; a box inside a <form> submits it with Enter like any other field.
 */
export declare function SearchField({ value, onChange, placeholder, label, id, className, inputRef, onKeyDown, ...inputProps }: SearchFieldProps): import("react").JSX.Element;
