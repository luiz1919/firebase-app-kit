export interface SearchFieldProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Accessible name; the placeholder when omitted. */
    label?: string;
    id?: string;
    autoFocus?: boolean;
    className?: string;
}
/**
 * Search box: a magnifier, and an × that clears it as soon as there is text, leaving the cursor in
 * the field. Escape clears it too. The browsers' own × is hidden: it is missing on some phones and
 * looks different on each, so every app gets the same one.
 */
export declare function SearchField({ value, onChange, placeholder, label, id, autoFocus, className }: SearchFieldProps): import("react").JSX.Element;
