import { useId } from 'react'
import type { AppEnvironment } from '../env.ts'
import { formatBuildTime } from '../utils/build.ts'
import type { BuildInfo } from '../utils/build.ts'
import { EnvironmentPanel } from './EnvironmentPanel.tsx'
import type { TestDataActions } from './EnvironmentPanel.tsx'
import { CloseIcon, ExternalLinkIcon, InfoIcon } from './icons.tsx'
import { useModalDialog } from './useModalDialog.ts'

export interface Developer {
  /** Link text, e.g. "luiz1919 en GitHub". */
  name: string
  url: string
}

export interface AboutButtonProps {
  appName: string
  /** The app's build constants: { version: __APP_VERSION__, commit: __APP_COMMIT__, buildTime: __BUILD_TIME__ }. */
  build: BuildInfo
  developer?: Developer
  /**
   * Project in use (initFirebase(...).environment). With a dev config, adds the "Entorno" section:
   * "Cambiar a Pruebas" for those allowed (canSwitchEnvironment) and, in Pruebas, "Volver a Real" for everyone.
   */
  environment?: AppEnvironment
  /** Who may switch to "Pruebas", e.g. the admins (useFeedbackAdmin). */
  canSwitchEnvironment?: boolean
  /** In "Pruebas": the app's generator and cleaner of test data. */
  testData?: TestDataActions
}

const DEFAULT_DEVELOPER: Developer = { name: 'luiz1919 en GitHub', url: 'https://github.com/luiz1919' }

/**
 * "Acerca de" (About) link that opens a modal dialog with the version, commit, build date and
 * developer and, with `environment`, the Real / Pruebas switch and the test data tools.
 */
export function AboutButton({ appName, build, developer = DEFAULT_DEVELOPER, environment, canSwitchEnvironment = false, testData }: AboutButtonProps) {
  const { open, close, dialogProps } = useModalDialog()
  const titleId = useId()

  return (
    <>
      <button className="kit-about-button" type="button" aria-haspopup="dialog" onClick={open}><InfoIcon />Acerca de</button>
      <dialog className="kit-dialog kit-about-dialog" aria-labelledby={titleId} {...dialogProps}>
        <div className="kit-dialog-heading kit-about-heading">
          <h2 id={titleId}>Acerca de {appName}</h2>
          <button className="kit-icon-button" type="button" autoFocus onClick={close} aria-label="Cerrar Acerca de" title="Cerrar"><CloseIcon /></button>
        </div>
        <dl className="kit-about-list">
          <dt>Versión</dt><dd>{build.version}</dd>
          {build.commit && <><dt>Commit</dt><dd><code>{build.commit}</code></dd></>}
          <dt>Última compilación</dt><dd>{build.buildTime ? <time dateTime={build.buildTime}>{formatBuildTime(build.buildTime)}</time> : formatBuildTime('')}</dd>
          <dt>Desarrollador</dt><dd><a href={developer.url} target="_blank" rel="noopener noreferrer">{developer.name}<ExternalLinkIcon /></a></dd>
        </dl>
        {environment && <EnvironmentPanel environment={environment} canSwitch={canSwitchEnvironment} testData={testData} />}
      </dialog>
    </>
  )
}
