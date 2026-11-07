// Build data shown in "Acerca de" (About). Each app passes its own __APP_VERSION__, __APP_COMMIT__
// and __BUILD_TIME__ (defined by the firebaseAppKit() plugin): the kit does not read those
// constants itself, because Vite's define is not reliable inside pre-bundled dependencies.
const buildTimeFormatter = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });
/** Build date for people (in the device's time zone), or "Versión de desarrollo" without one. */
export function formatBuildTime(buildTime) {
    if (!buildTime)
        return 'Versión de desarrollo';
    const date = new Date(buildTime);
    return Number.isNaN(date.getTime()) ? buildTime : buildTimeFormatter.format(date);
}
