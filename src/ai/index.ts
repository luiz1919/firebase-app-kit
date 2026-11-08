// AI with the user's own key, called from the browser: Google Gemini, OpenAI and Anthropic (Claude)
// behind one function, plus the settings shape the apps store. No dependencies (works in Node tests).
export {
  AI_PROVIDERS, AiError, DEFAULT_ANTHROPIC_MODEL, askAi, isAiProviderId, listModels, parseJsonObject, providerName, suggestModel,
} from './providers.ts'
export type { AiEffort, AiErrorKind, AiImage, AiProviderId, AiProviderInfo, AskInput, AskOptions, AskResult, JsonSchema } from './providers.ts'
export { DEFAULT_AI_SETTINGS, activeAi, parseAiSettings } from './settings.ts'
export type { ActiveAi, AiProviderSettings, AiSettings, AiSettingsActions } from './settings.ts'
