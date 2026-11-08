// AI settings shared by the apps. Each app stores them in the user's account (suggested document:
// users/{uid}/settings/ai), never in the code, the bundle or the backups.
import { AI_PROVIDERS, isAiProviderId } from "./providers.js";
export const DEFAULT_AI_SETTINGS = { providers: {}, lastProvider: null, anthropicFallback: true };
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Reads stored settings; unknown providers, entries without a key and malformed fields are ignored. */
export function parseAiSettings(data) {
    const stored = isRecord(data) ? data : {};
    const providers = {};
    const storedProviders = isRecord(stored.providers) ? stored.providers : {};
    for (const { id } of AI_PROVIDERS) {
        const entry = storedProviders[id];
        if (!isRecord(entry) || typeof entry.apiKey !== 'string' || !entry.apiKey)
            continue;
        providers[id] = {
            apiKey: entry.apiKey,
            model: typeof entry.model === 'string' ? entry.model : '',
            ...(Array.isArray(entry.models) ? { models: entry.models.filter((model) => typeof model === 'string') } : {}),
        };
    }
    return {
        providers,
        lastProvider: isAiProviderId(stored.lastProvider) ? stored.lastProvider : null,
        anthropicFallback: typeof stored.anthropicFallback === 'boolean' ? stored.anthropicFallback : DEFAULT_AI_SETTINGS.anthropicFallback,
    };
}
/** The provider to ask: the last one used if it has a key and a model, otherwise the first one ready. */
export function activeAi(settings) {
    const ready = (id) => {
        const entry = id ? settings.providers[id] : undefined;
        return id && entry?.apiKey && entry.model ? { provider: id, apiKey: entry.apiKey, model: entry.model } : null;
    };
    return ready(settings.lastProvider) ?? AI_PROVIDERS.map(({ id }) => ready(id)).find(Boolean) ?? null;
}
