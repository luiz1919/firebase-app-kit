// Recent errors of the page (uncaught errors, rejected promises and console.error), kept so a bug
// report can include them. In memory and in sessionStorage, so they survive the reload people
// usually do after something breaks. No dependencies.

export interface ErrorLogEntry {
  /** When it happened, ISO date. */
  at: string
  message: string
}

export const ERROR_LOG_SIZE = 20
const MAX_MESSAGE = 500
const STORAGE_KEY = 'firebase-app-kit.errors'

let entries: ErrorLogEntry[] = []
let installed = false

/** Readable one-line text of anything thrown or logged. */
export function describeError(value: unknown): string {
  if (value instanceof Error) {
    // The first stack frame says where it happened (browsers put the message on the first line).
    const frame = value.stack?.split('\n').map((line) => line.trim()).find((line) => line.startsWith('at ') || line.includes('@'))
    return `${value.name}: ${value.message}${frame ? ` (${frame.replace(/^at /, '')})` : ''}`
  }
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/** `list` with `message` added at the end, keeping the newest `size` entries. */
export function appendErrorEntry(list: readonly ErrorLogEntry[], message: string, at = new Date(), size = ERROR_LOG_SIZE): ErrorLogEntry[] {
  const clean = message.replace(/\s+/g, ' ').trim()
  if (!clean) return [...list]
  const entry = { at: at.toISOString(), message: clean.length > MAX_MESSAGE ? `${clean.slice(0, MAX_MESSAGE - 1)}…` : clean }
  return [...list, entry].slice(-size)
}

function save() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Private mode or storage full: the errors stay in memory only.
  }
}

/** Adds an error to the log (also used by installErrorLog). */
export function logError(value: unknown): void {
  entries = appendErrorEntry(entries, describeError(value))
  if (installed) save()
}

/** The recent errors, oldest first. */
export const recentErrors = (): ErrorLogEntry[] => [...entries]

export function clearErrorLog(): void {
  entries = []
  if (installed) save()
}

/**
 * Starts recording errors: call it once, as early as possible (e.g. in main.tsx). Calling it
 * again does nothing. Browser only.
 */
export function installErrorLog(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    if (Array.isArray(saved)) {
      const valid = saved.filter((entry): entry is ErrorLogEntry =>
        typeof entry === 'object' && entry !== null && typeof entry.at === 'string' && typeof entry.message === 'string')
      entries = [...valid, ...entries].slice(-ERROR_LOG_SIZE)
    }
  } catch {
    // Nothing saved, or unreadable.
  }
  window.addEventListener('error', (event) => {
    if (event.error || event.message) logError(event.error ?? event.message)
  })
  window.addEventListener('unhandledrejection', (event) => logError(event.reason))
  const consoleError = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    logError(args.map(describeError).join(' '))
    consoleError(...args)
  }
}
