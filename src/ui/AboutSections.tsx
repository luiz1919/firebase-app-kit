import { useId } from 'react'
import type { AppEnvironment } from '../env.ts'
import { formatBuildTime } from '../utils/build.ts'
import type { BuildInfo } from '../utils/build.ts'
import { EnvironmentPanel } from './EnvironmentPanel.tsx'
import type { TestDataActions } from './EnvironmentPanel.tsx'
import { ExternalLinkIcon } from './icons.tsx'

export interface Developer {
  /** Link text, e.g. "luiz1919 en GitHub". */
  name: string
  /** '' shows the name without a link (a placeholder such as "Por definir"). */
  url: string
}

/** A link of the "Enlaces" card. An empty `url` is a placeholder, shown as "Próximamente" (coming soon). */
export interface AboutLink {
  label: string
  url: string
}

/** What "Acerca de" (About) shows. Only `appName` and `build` are required; empty cards are left out. */
export interface AboutInfo {
  appName: string
  /** The app's build constants: { version: __APP_VERSION__, commit: __APP_COMMIT__, buildTime: __BUILD_TIME__ }. */
  build: BuildInfo
  developer?: Developer
  /** The app's icon next to its name, e.g. '/icons/icon-192.png'. */
  icon?: string
  /** One line under the name. */
  tagline?: string
  /** What the app is for, in a sentence or two. */
  description?: string
  /** "Tecnología" card: one item per library or service. */
  technology?: readonly string[]
  /** "Privacidad" card: one item per thing the app does with the user's data. */
  privacy?: readonly string[]
  /** Notice above the privacy items, e.g. that the text is a draft. */
  privacyNote?: string
  /** "Enlaces" card. */
  links?: readonly AboutLink[]
  /** Small print under the links ("X no está asociada con ..."). */
  disclaimer?: string
  /**
   * Project in use (initFirebase(...).environment). With a dev config, adds the "Entorno" card:
   * "Cambiar a Pruebas" for those allowed (canSwitchEnvironment) and, in Pruebas, "Volver a Real" for everyone.
   */
  environment?: AppEnvironment
  /** Who may switch to "Pruebas", e.g. the admins (useFeedbackAdmin). */
  canSwitchEnvironment?: boolean
  /** In "Pruebas": the app's generator and cleaner of test data. */
  testData?: TestDataActions
}

export const DEFAULT_DEVELOPER: Developer = { name: 'luiz1919 en GitHub', url: 'https://github.com/luiz1919' }

function ExternalLink({ label, url }: AboutLink) {
  return <a className="kit-about-link" href={url} target="_blank" rel="noopener noreferrer">{label}<ExternalLinkIcon /></a>
}

/**
 * The cards of "Acerca de", shared by AboutPage (a screen, `level` 2) and AboutButton (a dialog,
 * `level` 3): description, "Versión", "Entorno", "Tecnología", "Privacidad" and "Enlaces".
 */
export function AboutSections({ info, level }: { info: AboutInfo; level: 2 | 3 }) {
  const { build, developer = DEFAULT_DEVELOPER, description, technology = [], privacy = [], privacyNote, links = [], disclaimer } = info
  const id = useId()
  const Heading = level === 2 ? 'h2' : 'h3'

  return (
    <>
      {description && <p className="kit-about-description">{description}</p>}

      <section className="kit-about-card" aria-labelledby={`${id}-version`}>
        <Heading id={`${id}-version`}>Versión</Heading>
        <dl className="kit-about-facts">
          <dt>Versión</dt><dd>{build.version}</dd>
          {build.commit && <><dt>Commit</dt><dd><code>{build.commit}</code></dd></>}
          <dt>Compilación</dt><dd>{build.buildTime ? <time dateTime={build.buildTime}>{formatBuildTime(build.buildTime)}</time> : formatBuildTime('')}</dd>
          <dt>Desarrollador</dt><dd>{developer.url ? <ExternalLink label={developer.name} url={developer.url} /> : developer.name}</dd>
        </dl>
      </section>

      {info.environment && <EnvironmentPanel environment={info.environment} canSwitch={info.canSwitchEnvironment ?? false} testData={info.testData} level={level} />}

      {technology.length > 0 && (
        <section className="kit-about-card" aria-labelledby={`${id}-technology`}>
          <Heading id={`${id}-technology`}>Tecnología</Heading>
          <ul className="kit-about-items">{technology.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}

      {(privacy.length > 0 || privacyNote) && (
        <section className="kit-about-card" aria-labelledby={`${id}-privacy`}>
          <Heading id={`${id}-privacy`}>Privacidad</Heading>
          {privacyNote && <p className="kit-notice kit-notice-warn">{privacyNote}</p>}
          {privacy.length > 0 && <ul className="kit-about-items">{privacy.map((item) => <li key={item}>{item}</li>)}</ul>}
        </section>
      )}

      {(links.length > 0 || disclaimer) && (
        <section className="kit-about-card" aria-labelledby={`${id}-links`}>
          <Heading id={`${id}-links`}>Enlaces</Heading>
          {links.length > 0 && (
            <ul className="kit-about-links">
              {links.map((link) => (
                <li key={link.label}>{link.url ? <ExternalLink {...link} /> : <span>{link.label} <span className="kit-badge">Próximamente</span></span>}</li>
              ))}
            </ul>
          )}
          {disclaimer && <p className="kit-hint">{disclaimer}</p>}
        </section>
      )}
    </>
  )
}
