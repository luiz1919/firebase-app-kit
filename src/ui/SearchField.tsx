import { useId, useImperativeHandle, useRef } from 'react'
import type { InputHTMLAttributes, Ref } from 'react'
import { CloseIcon, SearchIcon } from './icons.tsx'

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'id' | 'className' | 'placeholder'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Accessible name; the placeholder when omitted. */
  label?: string
  id?: string
  /** Class of the wrapper (the box with the magnifier and the ×). */
  className?: string
  /** The <input>, to focus it (a shortcut key, after a result...). */
  inputRef?: Ref<HTMLInputElement>
}

/**
 * Search box: a magnifier, and an × that clears it as soon as there is text, leaving the cursor in
 * the field. Escape clears it too. The browsers' own × is hidden: it is missing on some phones and
 * looks different on each, so every app gets the same one. Any other attribute of an <input>
 * (`lang`, `maxLength`, `spellCheck`, `autoCapitalize`, `name`, `required`, `onKeyDown`...) goes to
 * the input; a box inside a <form> submits it with Enter like any other field.
 */
export function SearchField({ value, onChange, placeholder = 'Buscar', label, id, className, inputRef, onKeyDown, ...inputProps }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  useImperativeHandle(inputRef, () => input.current as HTMLInputElement)
  const generated = useId()
  const fieldId = id ?? generated

  return (
    <div className={`kit-search${className ? ` ${className}` : ''}`}>
      <label className="kit-sr-only" htmlFor={fieldId}>{label ?? placeholder}</label>
      <SearchIcon />
      <input
        autoComplete="off"
        enterKeyHint="search"
        {...inputProps}
        id={fieldId}
        ref={input}
        className="kit-input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          // Only with text: with nothing to clear, Escape keeps closing the dialog or screen around.
          if (event.key === 'Escape' && value && !event.defaultPrevented) {
            event.preventDefault()
            onChange('')
          }
        }}
      />
      {value && (
        <button
          className="kit-icon-button kit-search-clear"
          type="button"
          aria-label="Borrar la búsqueda"
          title="Borrar"
          onClick={() => {
            onChange('')
            input.current?.focus()
          }}
        >
          <CloseIcon size={18} />
        </button>
      )}
    </div>
  )
}
