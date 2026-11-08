export type AiProviderId = 'anthropic' | 'gemini' | 'openai';
export interface AiProviderInfo {
    id: AiProviderId;
    name: string;
    cost: string;
    /** Where the key is created (the provider's main page). */
    keyPage: string;
}
export declare const AI_PROVIDERS: AiProviderInfo[];
export declare const providerName: (id: AiProviderId) => string;
export declare function isAiProviderId(value: unknown): value is AiProviderId;
/** Default Claude model (the one currently recommended by Anthropic). Gemini and OpenAI are picked from their list. */
export declare const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";
/**
 * Model suggested when testing the connection if none has been chosen yet: for Claude, the
 * recommended one; for Gemini, the latest "flash"; for OpenAI, the latest "gpt".
 */
export declare function suggestModel(provider: AiProviderId, models: string[]): string;
export type AiErrorKind = 'auth' | 'quota' | 'network' | 'timeout' | 'refusal' | 'other';
export declare class AiError extends Error {
    readonly kind: AiErrorKind;
    constructor(kind: AiErrorKind, message: string);
}
/** An image for the question (a photo to read, for example). */
export interface AiImage {
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
    /** Base64, without the "data:...;base64," prefix. */
    data: string;
}
export type JsonSchema = Record<string, unknown>;
export interface AskInput {
    system: string;
    question: string;
    images?: AiImage[];
    /**
     * Ask for one JSON object. Claude gets the schema as a structured output; Gemini and OpenAI only
     * get their JSON mode, so the app must also describe the shape (and say "JSON") in its prompt.
     * Read the answer with parseJsonObject().
     */
    schema?: JsonSchema;
}
export interface AskResult {
    text: string;
    /** Model that actually answered (may be the fallback one). */
    model: string;
    note?: string;
}
export type AiEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export interface AskOptions {
    apiKey: string;
    model: string;
    /** Claude only: enables automatic fallback. */
    fallback?: boolean;
    timeoutMs?: number;
    /** Claude: max_tokens (16000 by default). Gemini and OpenAI: only sent when given. */
    maxTokens?: number;
    /** Claude only: how much it thinks (output_config.effort). */
    effort?: AiEffort;
}
export interface ProviderRequest {
    url: string;
    init: {
        method?: 'POST';
        headers: Record<string, string>;
        body?: string;
    };
}
/** Provider error message, without echoing the key or very long texts. */
export declare function providerMessage(body: unknown): string;
/** Turns an HTTP error into an AiError (null for a successful status). */
export declare function httpError(status: number, body: unknown): AiError | null;
export declare function buildAnthropicRequest(input: AskInput, options: AskOptions): ProviderRequest;
export declare function readAnthropicResponse(body: unknown, options: Pick<AskOptions, 'model'>): AskResult;
export declare function buildGeminiRequest(input: AskInput, options: AskOptions): ProviderRequest;
export declare function readGeminiResponse(body: unknown, options: Pick<AskOptions, 'model'>): AskResult;
export declare function buildOpenAiRequest(input: AskInput, options: AskOptions): ProviderRequest;
export declare function readOpenAiResponse(body: unknown, options: Pick<AskOptions, 'model'>): AskResult;
export declare function buildModelsRequest(provider: AiProviderId, apiKey: string): ProviderRequest;
/** Sorted, unique model ids that can answer questions. */
export declare function readModelsResponse(provider: AiProviderId, body: unknown): string[];
export declare function buildAskRequest(provider: AiProviderId, input: AskInput, options: AskOptions): ProviderRequest;
export declare function readAskResponse(provider: AiProviderId, body: unknown, options: Pick<AskOptions, 'model'>): AskResult;
export declare function askAi(provider: AiProviderId, input: AskInput, options: AskOptions): Promise<AskResult>;
/** Models available with that key; also used to check the key without spending quota. */
export declare function listModels(provider: AiProviderId, apiKey: string): Promise<string[]>;
/**
 * Reads the JSON object of an answer requested with `schema`. Tolerates Markdown fences and text
 * around the object (Gemini and OpenAI only have a JSON mode, and some models still add them).
 */
export declare function parseJsonObject(text: string): Record<string, unknown>;
