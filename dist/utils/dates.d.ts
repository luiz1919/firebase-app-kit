/** Today's date in local time, as YYYY-MM-DD. */
export declare function todayIso(): string;
/**
 * Local date and time for file names, as YYYY-MM-DD_HHMM ("2026-11-06_1030"): a newly generated
 * file does not take the name of an older copy saved on the device.
 */
export declare function fileTimestamp(date?: Date): string;
/** Formats a YYYY-MM-DD date ("5 nov 2026") without time zone shifts. */
export declare function formatDate(isoDate: string): string;
