import { useEffect, useId, useRef, useState } from 'react'
import { switchAppEnv } from '../env.ts'
import type { AppEnvironment } from '../env.ts'
import type { WriteProgress } from '../testData.ts'

export interface TestDataSize {
  id: string
  /** E.g. "Bastantes (≈500)". */
  label: string
}

/** The app's test data generator, shown in "Acerca de" (About) only while in "Pruebas". */
export interface TestDataActions {
  /** Amounts to choose from; the first one is selected by default. */
  sizes: readonly TestDataSize[]
  /** Creates test data of that size; resolves to a summary for the user ("Creadas 5 listas…"). */
  generate: (sizeId: string, onProgress: (progress: WriteProgress) => void) => Promise<string>
  /** Deletes the user's data in the dev project; resolves to a summary for the user. */
  clear: (onProgress: (progress: WriteProgress) => void) => Promise<string>
}

type Status = { tone: 'info' | 'ok' | 'error'; text: string } | null

const LABELS = { prod: 'Real', dev: 'Pruebas' } as const

const SWITCH_QUESTIONS = {
  dev: '¿Cambiar a Pruebas? La app se recargará con la base de datos de pruebas (otro proyecto de Firebase): tendrás que iniciar sesión con tu usuario de pruebas.',
  prod: '¿Volver a Real? La app se recargará con tus datos reales.',
} as const

function progressText(verb: string, { done, total }: WriteProgress): string {
  return `${verb}… ${done.toLocaleString('es')} de ${total.toLocaleString('es')}`
}

interface EnvironmentPanelProps {
  environment: AppEnvironment
  canSwitch: boolean
  testData?: TestDataActions
}

/** "Entorno" (Environment) section of "Acerca de" (About): Real / Pruebas switch and test data. */
export function EnvironmentPanel({ environment, canSwitch, testData }: EnvironmentPanelProps) {
  const [size, setSize] = useState(testData?.sizes[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // On a phone the dialog scrolls: keep the progress and the result in view.
  useEffect(() => {
    if (status) statusRef.current?.scrollIntoView({ block: 'nearest' })
  }, [status])
  const isDev = environment.current === 'dev'
  // In "Pruebas" the way back is always there (the dev project may have no admins).
  if (!environment.devAvailable || (!isDev && !canSwitch)) return null

  function change() {
    const target = isDev ? 'prod' : 'dev'
    if (window.confirm(SWITCH_QUESTIONS[target])) switchAppEnv(target)
  }

  async function run(verb: string, action: (onProgress: (progress: WriteProgress) => void) => Promise<string>) {
    setBusy(true)
    setStatus({ tone: 'info', text: `${verb}…` })
    try {
      const summary = await action((progress) => setStatus({ tone: 'info', text: progressText(verb, progress) }))
      setStatus({ tone: 'ok', text: summary })
    } catch (error) {
      setStatus({ tone: 'error', text: error instanceof Error && error.message ? error.message : 'No se ha podido terminar. Revisa la conexión.' })
    } finally {
      setBusy(false)
    }
  }

  function clear() {
    if (!testData || !window.confirm('¿Borrar todos tus datos de Pruebas? Los datos reales no se tocan.')) return
    void run('Borrando', testData.clear)
  }

  return (
    <section className="kit-env-panel" aria-labelledby={titleId}>
      <h3 id={titleId}>Entorno</h3>
      <p className="kit-env-current">
        <span className={`kit-env-badge kit-env-badge-${environment.current}`}>{LABELS[environment.current]}</span>
        <code>{environment.projectId}</code>
      </p>
      <p className="kit-env-hint">
        {isDev
          ? 'Estás usando la base de datos de pruebas: puedes crear y borrar lo que quieras sin tocar tus datos reales.'
          : 'Pruebas usa otra base de datos, para probar sin tocar tus datos reales.'}
      </p>
      <button className="kit-secondary-button" type="button" onClick={change} disabled={busy}>
        {isDev ? 'Volver a Real' : 'Cambiar a Pruebas'}
      </button>

      {isDev && testData && (
        <div className="kit-env-test-data">
          <h3>Datos de prueba</h3>
          <fieldset className="kit-env-sizes" disabled={busy}>
            <legend>Cantidad</legend>
            {testData.sizes.map((option) => (
              <label key={option.id} className="kit-env-size">
                <input type="radio" name={`${titleId}-size`} value={option.id} checked={size === option.id} onChange={() => setSize(option.id)} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <button className="kit-primary-button" type="button" disabled={busy || !size} onClick={() => void run('Creando datos', (onProgress) => testData.generate(size, onProgress))}>
            Generar datos de prueba
          </button>
          <button className="kit-secondary-button kit-env-clear" type="button" disabled={busy} onClick={clear}>
            Borrar mis datos de prueba
          </button>
          <div ref={statusRef} role="status" aria-live="polite">
            {status && <p className={`kit-notice kit-notice-${status.tone === 'info' ? 'warn' : status.tone}`}>{status.text}</p>}
          </div>
          <p className="kit-env-hint">Necesita conexión. Cada vez que generas, se añaden datos nuevos a los que ya hay.</p>
        </div>
      )}
    </section>
  )
}
