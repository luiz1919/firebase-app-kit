import { useId, useRef } from 'react'
import { CloseIcon, SearchIcon } from './icons.tsx'

export interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Accessible name; the placeholder when omitted. */
  label?: string
  id?: string
  autoFocus?: boolean
  className?: string
}

/**
 * Search box: a magnifier, and an × that clears it as soon as there is text, leaving the cursor in
 * the field. Escape clears it too. The browsers' own × is hidden: it is missing on some phones and
 * looks different on each, so every app gets the same one.
 */
export function SearchField({ value, onChange, placeholder = 'Buscar', label, id, autoFocus, className }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  const generated = useId()
  const fieldId = id ?? generated

  return (
    <div className={`kit-search${className ? ` ${className}` : ''}`}>
      <label className="kit-sr-only" htmlFor={fieldId}>{label ?? placeholder}</label>
      <SearchIcon />
      <input
        id={fieldId}
        ref={input}
        className="kit-input"
        type="search"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value)}
        // Only with text: with nothing to clear, Escape keeps closing the dialog or screen around.
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
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
