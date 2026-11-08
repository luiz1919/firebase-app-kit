import type { AiProviderId } from './providers.ts';
export interface AiProviderSettings {
    apiKey: string;
    model: string;
    /** Models available with that key, saved when testing the connection. */
    models?: string[];
}
export interface AiSettings {
    providers: Partial<Record<AiProviderId, AiProviderSettings>>;
    lastProvider: AiProviderId | null;
    /** Claude: automatic retry with another Anthropic model if it refuses the question. */
    anthropicFallback: boolean;
}
export declare const DEFAULT_AI_SETTINGS: AiSettings;
/** What the settings panel needs to change them (each app writes them to its own store). */
export interface AiSettingsActions {
    /** Saves a provider's key and/or model (only the given fields). */
    saveProvider(id: AiProviderId, values: Partial<AiProviderSettings>): void | Promise<unknown>;
    removeProvider(id: AiProviderId): void | Promise<unknown>;
    setLastProvider(id: AiProviderId): void | Promise<unknown>;
    setAnthropicFallback(enabled: boolean): void | Promise<unknown>;
}
/** Reads stored settings; unknown providers, entries without a key and malformed fields are ignored. */
export declare function parseAiSettings(data: unknown): AiSettings;
export interface ActiveAi {
    provider: AiProviderId;
    apiKey: string;
    model: string;
}
/** The provider to ask: the last one used if it has a key and a model, otherwise the first one ready. */
export declare function activeAi(settings: AiSettings): ActiveAi | null;
