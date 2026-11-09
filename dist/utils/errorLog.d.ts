export interface ErrorLogEntry {
    /** When it happened, ISO date. */
    at: string;
    message: string;
}
export declare const ERROR_LOG_SIZE = 20;
/** Readable one-line text of anything thrown or logged. */
export declare function describeError(value: unknown): string;
/** `list` with `message` added at the end, keeping the newest `size` entries. */
export declare function appendErrorEntry(list: readonly ErrorLogEntry[], message: string, at?: Date, size?: number): ErrorLogEntry[];
/** Adds an error to the log (also used by installErrorLog). */
export declare function logError(value: unknown): void;
/** The recent errors, oldest first. */
export declare const recentErrors: () => ErrorLogEntry[];
export declare function clearErrorLog(): void;
/**
 * Starts recording errors: call it once, as early as possible (e.g. in main.tsx). Calling it
 * again does nothing. Browser only.
 */
export declare function installErrorLog(): void;
