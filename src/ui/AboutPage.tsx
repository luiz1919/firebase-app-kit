import { useId } from 'react'
import { AboutSections } from './AboutSections.tsx'
import type { AboutInfo } from './AboutSections.tsx'
import { ArrowLeftIcon } from './icons.tsx'

export interface AboutPageProps extends AboutInfo {
  /** Way back to the settings screen: a link (hash routes) or a button (screens kept in state). */
  back?: { label: string; href?: string; onClick?: () => void }
}

/**
 * "Acerca de" (About) as a screen, opened from the app's "Ajustes" (Settings): the app's icon,
 * name and tagline, then the cards (see AboutInfo). Its <h1> (class kit-about-title) takes
 * tabIndex -1, so the app can move the focus to it after navigating.
 */
export function AboutPage({ back, ...info }: AboutPageProps) {
  const titleId = useId()

  return (
    <section className="kit-about kit-about-page" aria-labelledby={titleId}>
      {back && (back.href
        ? <a className="kit-about-back" href={back.href}><ArrowLeftIcon size={18} />{back.label}</a>
        : <button className="kit-about-back" type="button" onClick={back.onClick}><ArrowLeftIcon size={18} />{back.label}</button>)}
      <div className="kit-about-hero">
        {info.icon && <img src={info.icon} width="64" height="64" alt="" />}
        <div>
          <h1 id={titleId} className="kit-about-title" tabIndex={-1}>{info.appName}</h1>
          {info.tagline && <p className="kit-about-tagline">{info.tagline}</p>}
        </div>
      </div>
      <AboutSections info={info} level={2} />
    </section>
  )
}
