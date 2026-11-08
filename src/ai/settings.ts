// AI settings shared by the apps. Each app stores them in the user's account (suggested document:
// users/{uid}/settings/ai), never in the code, the bundle or the backups.
import { AI_PROVIDERS, isAiProviderId } from './providers.ts'
import type { AiProviderId } from './providers.ts'

export interface AiProviderSettings {
  apiKey: string
  model: string
  /** Models available with that key, saved when testing the connection. */
  models?: string[]
}

export interface AiSettings {
  providers: Partial<Record<AiProviderId, AiProviderSettings>>
  lastProvider: AiProviderId | null
  /** Claude: automatic retry with another Anthropic model if it refuses the question. */
  anthropicFallback: boolean
}

export const DEFAULT_AI_SETTINGS: AiSettings = { providers: {}, lastProvider: null, anthropicFallback: true }

/** What the settings panel needs to change them (each app writes them to its own store). */
export interface AiSettingsActions {
  /** Saves a provider's key and/or model (only the given fields). */
  saveProvider(id: AiProviderId, values: Partial<AiProviderSettings>): void | Promise<unknown>
  removeProvider(id: AiProviderId): void | Promise<unknown>
  setLastProvider(id: AiProviderId): void | Promise<unknown>
  setAnthropicFallback(enabled: boolean): void | Promise<unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads stored settings; unknown providers, entries without a key and malformed fields are ignored. */
export function parseAiSettings(data: unknown): AiSettings {
  const stored = isRecord(data) ? data : {}
  const providers: AiSettings['providers'] = {}
  const storedProviders = isRecord(stored.providers) ? stored.providers : {}
  for (const { id } of AI_PROVIDERS) {
    const entry = storedProviders[id]
    if (!isRecord(entry) || typeof entry.apiKey !== 'string' || !entry.apiKey) continue
    providers[id] = {
      apiKey: entry.apiKey,
      model: typeof entry.model === 'string' ? entry.model : '',
      ...(Array.isArray(entry.models) ? { models: entry.models.filter((model): model is string => typeof model === 'string') } : {}),
    }
  }
  return {
    providers,
    lastProvider: isAiProviderId(stored.lastProvider) ? stored.lastProvider : null,
    anthropicFallback: typeof stored.anthropicFallback === 'boolean' ? stored.anthropicFallback : DEFAULT_AI_SETTINGS.anthropicFallback,
  }
}

export interface ActiveAi {
  provider: AiProviderId
  apiKey: string
  model: string
}

/** The provider to ask: the last one used if it has a key and a model, otherwise the first one ready. */
export function activeAi(settings: AiSettings): ActiveAi | null {
  const ready = (id: AiProviderId | null): ActiveAi | null => {
    const entry = id ? settings.providers[id] : undefined
    return id && entry?.apiKey && entry.model ? { provider: id, apiKey: entry.apiKey, model: entry.model } : null
  }
  return ready(settings.lastProvider) ?? AI_PROVIDERS.map(({ id }) => ready(id)).find(Boolean) ?? null
}
