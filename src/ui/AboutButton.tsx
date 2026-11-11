import { useId } from 'react'
import { AboutSections } from './AboutSections.tsx'
import type { AboutInfo } from './AboutSections.tsx'
import { CloseIcon, InfoIcon } from './icons.tsx'
import { useModalDialog } from './useModalDialog.ts'

export type { Developer } from './AboutSections.tsx'

export type AboutButtonProps = AboutInfo

/**
 * Info icon button (40 px, for a header, e.g. the sign-in screen's) that opens "Acerca de"
 * (About) in a modal dialog, with the same cards as AboutPage. Inside the app, prefer AboutPage
 * in "Ajustes" (Settings).
 */
export function AboutButton(info: AboutButtonProps) {
  const { open, close, dialogProps } = useModalDialog()
  const titleId = useId()

  return (
    <>
      <button className="kit-icon-button kit-about-button" type="button" aria-haspopup="dialog" onClick={open} aria-label={`Acerca de ${info.appName}`} title="Acerca de">
        <InfoIcon size={20} />
      </button>
      <dialog className="kit-dialog kit-about-dialog" aria-labelledby={titleId} {...dialogProps}>
        <div className="kit-dialog-heading">
          <h2 id={titleId}>Acerca de {info.appName}</h2>
          <button className="kit-icon-button" type="button" autoFocus onClick={close} aria-label="Cerrar Acerca de" title="Cerrar"><CloseIcon /></button>
        </div>
        <div className="kit-about">
          {(info.icon || info.tagline) && (
            <div className="kit-about-hero kit-about-hero-small">
              {info.icon && <img src={info.icon} width="48" height="48" alt="" />}
              {info.tagline && <p className="kit-about-tagline">{info.tagline}</p>}
            </div>
          )}
          <AboutSections info={info} level={3} />
        </div>
      </dialog>
    </>
  )
}
