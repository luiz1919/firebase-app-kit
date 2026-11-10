import type { AppEnvironment } from '../env.ts'

/**
 * Orange band for the top of the page while the app uses the dev project ("Pruebas"), so test
 * data is never mistaken for real data. Renders nothing in production. While it is shown, the
 * --kit-env-banner-height CSS variable gives its height (for sticky headers: top: var(--kit-env-banner-height, 0)).
 */
export function EnvBanner({ environment }: { environment: AppEnvironment }) {
  if (environment.current !== 'dev') return null
  return (
    <div className="kit-env-banner" role="note">
      <strong>Pruebas</strong> · estos datos no son reales
    </div>
  )
}
