import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { AI_PROVIDERS, AiError, DEFAULT_ANTHROPIC_MODEL, listModels, suggestModel } from '../ai/providers.ts'
import type { AiProviderInfo } from '../ai/providers.ts'
import type { AiSettings, AiSettingsActions } from '../ai/settings.ts'

export interface AiSettingsPanelProps {
  settings: AiSettings
  actions: AiSettingsActions
}

function ProviderCard({ info, settings, actions }: { info: AiProviderInfo } & AiSettingsPanelProps) {
  const saved = settings.providers[info.id]
  const [editingKey, setEditingKey] = useState(!saved)
  const [keyInput, setKeyInput] = useState('')
  const [models, setModels] = useState<string[] | null>(null)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const id = useId()

  function saveKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const apiKey = keyInput.trim()
    if (!apiKey) return
    // Claude has a recommended model; for Gemini and OpenAI it is chosen after "Probar conexión" (Test connection).
    const model = saved?.model || (info.id === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : '')
    // A different key may give access to other models: the list is rebuilt when testing the connection.
    void actions.saveProvider(info.id, { apiKey, model, models: [] })
    setKeyInput('')
    setEditingKey(false)
    setMessage({ tone: 'ok', text: 'Clave guardada. Pulsa «Probar conexión» para comprobarla y elegir modelo.' })
  }

  async function test() {
    if (!saved) return
    setTesting(true)
    setMessage(null)
    try {
      const list = await listModels(info.id, saved.apiKey)
      setModels(list)
      // Without a model no questions can be asked: suggest one from the list and save it.
      const suggested = !saved.model || !list.includes(saved.model) ? suggestModel(info.id, list) : ''
      // The list is saved in the account, so the dropdown always has it, on any device.
      void actions.saveProvider(info.id, { models: list, ...(suggested ? { model: suggested } : {}) })
      setMessage({
        tone: 'ok',
        text: list.length === 0
          ? 'Conexión correcta, pero no hay modelos disponibles.'
          : `Conexión correcta: ${list.length} modelos disponibles.` + (suggested ? ` He elegido ${suggested}; puedes cambiarlo abajo.` : ''),
      })
    } catch (testError) {
      setMessage({ tone: 'error', text: testError instanceof AiError ? testError.message : 'No se ha podido comprobar la clave.' })
    } finally {
      setTesting(false)
    }
  }

  function remove() {
    if (!window.confirm(`¿Borrar la clave de ${info.name}?`)) return
    void actions.removeProvider(info.id)
    setModels(null)
    setEditingKey(true)
    setMessage(null)
  }

  // The saved model is shown even if the list has not been requested yet.
  const modelOptions = [...new Set([...(saved?.model ? [saved.model] : []), ...(models ?? saved?.models ?? [])])].sort()

  return (
    <li className="kit-ai-card">
      <div className="kit-ai-card-head">
        <h2 className="kit-ai-card-title">{info.name}</h2>
        <span className={`kit-badge${info.cost.startsWith('Nivel gratuito') ? ' kit-badge-ok' : ''}`}>{info.cost}</span>
      </div>
      <p className="kit-ai-meta">
        {saved ? `Clave guardada: ••••${saved.apiKey.slice(-4)}` : 'Sin configurar'}
        {saved?.model && ` · Modelo: ${saved.model}`}
      </p>
      {saved && !saved.model && <p className="kit-notice kit-notice-warn">Falta elegir el modelo: pulsa «Probar conexión».</p>}

      {editingKey ? (
        <form className="kit-ai-form" onSubmit={saveKey} noValidate>
          <div className="kit-field">
            <label htmlFor={`${id}-key`}>Clave de la API</label>
            <input id={`${id}-key`} className="kit-input" type="password" autoComplete="off" spellCheck={false} value={keyInput} onChange={(event) => setKeyInput(event.target.value)} aria-describedby={`${id}-key-hint`} />
            <p id={`${id}-key-hint`} className="kit-hint">
              Se crea en{' '}
              <a className="kit-link" href={info.keyPage} target="_blank" rel="noopener noreferrer">{info.keyPage.replace('https://', '')}</a>
              . Se guarda en tu cuenta, no en el código ni en las copias.
            </p>
          </div>
          <div className="kit-actions">
            <button type="submit" className="kit-primary-button" disabled={!keyInput.trim()}>Guardar clave</button>
            {saved && <button type="button" className="kit-secondary-button" onClick={() => setEditingKey(false)}>Cancelar</button>}
          </div>
        </form>
      ) : (
        <>
          <div className="kit-actions">
            <button type="button" className="kit-secondary-button" disabled={testing} onClick={() => void test()}>{testing ? 'Comprobando…' : 'Probar conexión'}</button>
            <button type="button" className="kit-link-button" onClick={() => setEditingKey(true)}>Cambiar clave</button>
            <button type="button" className="kit-link-button kit-link-danger" onClick={remove}>Borrar clave</button>
          </div>
          {modelOptions.length > 0 && (
            <div className="kit-field">
              <label htmlFor={`${id}-model`}>Modelo</label>
              <select id={`${id}-model`} className="kit-input" value={saved?.model ?? ''} onChange={(event) => void actions.saveProvider(info.id, { model: event.target.value })}>
                {!saved?.model && <option value="">Elige un modelo</option>}
                {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </div>
          )}
          {saved && !saved.model && !models && !saved.models?.length && <p className="kit-hint">Pulsa «Probar conexión» para ver los modelos disponibles con tu clave.</p>}
          {info.id === 'anthropic' && (
            <label className="kit-checkbox">
              <input type="checkbox" checked={settings.anthropicFallback} onChange={(event) => void actions.setAnthropicFallback(event.target.checked)} />
              Si Claude rechaza la pregunta, reintentar con otro modelo de Anthropic (recomendado)
            </label>
          )}
        </>
      )}
      <div role="status">{message && <p className={`kit-notice kit-notice-${message.tone}`}>{message.text}</p>}</div>
    </li>
  )
}

/**
 * One card per AI provider: save, change or delete the key, "Probar conexión" (Test connection,
 * which lists the models without spending quota and suggests one) and the model. The app owns the
 * page heading and the privacy notes around it, and stores the settings through `actions`.
 */
export function AiSettingsPanel({ settings, actions }: AiSettingsPanelProps) {
  return (
    <ul className="kit-ai-list">
      {AI_PROVIDERS.map((info) => <ProviderCard key={info.id} info={info} settings={settings} actions={actions} />)}
    </ul>
  )
}
