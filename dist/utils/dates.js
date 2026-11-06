// YYYY-MM-DD dates in local time. No dependencies.
const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const pad = (value) => String(value).padStart(2, '0');
const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
/** Today's date in local time, as YYYY-MM-DD. */
export function todayIso() {
    return isoDate(new Date());
}
/**
 * Local date and time for file names, as YYYY-MM-DD_HHMM ("2026-11-06_1030"): a newly generated
 * file does not take the name of an older copy saved on the device.
 */
export function fileTimestamp(date = new Date()) {
    return `${isoDate(date)}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}
/** Formats a YYYY-MM-DD date ("5 nov 2026") without time zone shifts. */
export function formatDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return dateFormatter.format(new Date(year, month - 1, day));
}
