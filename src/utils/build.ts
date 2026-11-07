// Build data shown in "Acerca de" (About). Each app passes its own __APP_VERSION__, __APP_COMMIT__
// and __BUILD_TIME__ (defined by the firebaseAppKit() plugin): the kit does not read those
// constants itself, because Vite's define is not reliable inside pre-bundled dependencies.

export interface BuildInfo {
  /** Version from package.json. */
  version: string
  /** Git commit that was built, or '' without git. */
  commit: string
  /** Build date in ISO format; '' in development. */
  buildTime: string
}

const buildTimeFormatter = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })

/** Build date for people (in the device's time zone), or "Versión de desarrollo" without one. */
export function formatBuildTime(buildTime: string): string {
  if (!buildTime) return 'Versión de desarrollo'
  const date = new Date(buildTime)
  return Number.isNaN(date.getTime()) ? buildTime : buildTimeFormatter.format(date)
}
