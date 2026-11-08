// AI adapters: the same shape for every provider, direct fetch calls from the browser with the
// user's own key (no SDK or server). Moved from CommunityAssistant, where the URLs, headers and
// formats were verified on 30/10/2026 against:
// - Anthropic: official API guide (curl) and the official TypeScript SDK code.
// - Google Gemini: official reference ai.google.dev/api (generateContent and models).
// - OpenAI: official API specification (openai-openapi).
// Request building and response reading are pure functions (tested with fixtures); only
// request() touches the network. User-facing messages are in Spanish, like the apps' UI.
export const AI_PROVIDERS = [
    { id: 'gemini', name: 'Google Gemini', cost: 'Nivel gratuito con límites', keyPage: 'https://aistudio.google.com' },
    { id: 'openai', name: 'OpenAI (ChatGPT)', cost: 'De pago por uso', keyPage: 'https://platform.openai.com' },
    { id: 'anthropic', name: 'Anthropic (Claude)', cost: 'De pago por uso', keyPage: 'https://platform.claude.com/settings/keys' },
];
export const providerName = (id) => AI_PROVIDERS.find((provider) => provider.id === id)?.name ?? id;
export function isAiProviderId(value) {
    return AI_PROVIDERS.some((provider) => provider.id === value);
}
/** Default Claude model (the one currently recommended by Anthropic). Gemini and OpenAI are picked from their list. */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5-5';
// Models in the lists that are not suitable for chat or are not stable.
const NOT_FOR_CHAT = /(preview|exp|tts|image|live|vision|audio|embedding|search|aqa|nano|realtime|transcribe)/i;
/**
 * Model suggested when testing the connection if none has been chosen yet: for Claude, the
 * recommended one; for Gemini, the latest "flash"; for OpenAI, the latest "gpt".
 */
export function suggestModel(provider, models) {
    if (provider === 'anthropic')
        return models.includes(DEFAULT_ANTHROPIC_MODEL) ? DEFAULT_ANTHROPIC_MODEL : (models[0] ?? '');
    const usable = models.filter((model) => !NOT_FOR_CHAT.test(model)).sort().reverse();
    const pattern = provider === 'gemini' ? /^gemini-.*flash(?!-lite)/i : /^gpt-\d/i;
    return usable.find((model) => pattern.test(model)) ?? usable[0] ?? models[0] ?? '';
}
// Claude models that accept automatic fallback in its "default" form.
const ANTHROPIC_FALLBACK_MODELS = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'];
export class AiError extends Error {
    kind;
    constructor(kind, message) {
        super(message);
        this.name = 'AiError';
        this.kind = kind;
    }
}
const REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_TOKENS = 16_000;
const CUT_MESSAGE = 'La respuesta de la IA se ha cortado porque era demasiado larga.';
/** Provider error message, without echoing the key or very long texts. */
export function providerMessage(body) {
    const error = body?.error;
    const message = typeof error?.message === 'string' ? error.message : '';
    return message.slice(0, 300);
}
/** Turns an HTTP error into an AiError (null for a successful status). */
export function httpError(status, body) {
    if (status >= 200 && status < 300)
        return null;
    const detail = providerMessage(body);
    if (status === 401 || status === 403)
        return new AiError('auth', `La clave no es válida o no tiene permiso${detail ? `: ${detail}` : '.'}`);
    if (status === 429)
        return new AiError('quota', `Se ha agotado la cuota o hay demasiadas peticiones${detail ? `: ${detail}` : '.'}`);
    return new AiError('other', `Error ${status} del proveedor${detail ? `: ${detail}` : '.'}`);
}
async function request({ url, init }, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
        response = await fetch(url, { ...init, signal: controller.signal });
    }
    catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
            throw new AiError('timeout', 'La IA ha tardado demasiado en responder. Inténtalo de nuevo.');
        }
        throw new AiError('network', 'No se ha podido contactar con la IA. Revisa la conexión.');
    }
    finally {
        clearTimeout(timer);
    }
    const body = await response.json().catch(() => null);
    const error = httpError(response.status, body);
    if (error)
        throw error;
    return body;
}
// --- Anthropic (Claude) -------------------------------------------------------------------------
const ANTHROPIC_URL = 'https://api.anthropic.com/v1';
function anthropicHeaders(apiKey, fallback) {
    return {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2026-10-21',
        // Required to call from the browser; the key belongs to the user themselves.
        'anthropic-dangerous-direct-browser-access': 'true',
        ...(fallback ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}),
    };
}
export function buildAnthropicRequest(input, options) {
    const fallback = Boolean(options.fallback) && ANTHROPIC_FALLBACK_MODELS.includes(options.model);
    const content = input.images?.length
        ? [
            ...input.images.map((image) => ({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } })),
            { type: 'text', text: input.question },
        ]
        : input.question;
    const outputConfig = {
        ...(options.effort ? { effort: options.effort } : {}),
        ...(input.schema ? { format: { type: 'json_schema', schema: input.schema } } : {}),
    };
    const body = {
        model: options.model,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: input.system,
        messages: [{ role: 'user', content }],
        ...(Object.keys(outputConfig).length > 0 ? { output_config: outputConfig } : {}),
        ...(fallback ? { fallbacks: 'default' } : {}),
    };
    return { url: `${ANTHROPIC_URL}/messages`, init: { method: 'POST', headers: anthropicHeaders(options.apiKey, fallback), body: JSON.stringify(body) } };
}
export function readAnthropicResponse(body, options) {
    const response = (body ?? {});
    // Check the stop reason before reading the content.
    if (response.stop_reason === 'refusal')
        throw new AiError('refusal', 'Claude no ha querido responder a esta pregunta.');
    if (response.stop_reason === 'max_tokens')
        throw new AiError('other', CUT_MESSAGE);
    const blocks = response.content ?? [];
    const text = blocks
        .filter((block) => block.type === 'text' && block.text)
        .map((block) => block.text)
        .join('\n\n')
        .trim();
    if (!text)
        throw new AiError('other', 'Claude no ha devuelto ninguna respuesta de texto.');
    const switched = blocks.find((block) => block.type === 'fallback');
    const model = response.model ?? options.model;
    const note = switched ? `Respondió el modelo de respaldo (${switched.to?.model ?? model}).` : undefined;
    return { text, model, ...(note ? { note } : {}) };
}
// --- Google Gemini ------------------------------------------------------------------------------
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta';
export function buildGeminiRequest(input, options) {
    const url = `${GEMINI_URL}/models/${encodeURIComponent(options.model)}:generateContent?key=${encodeURIComponent(options.apiKey)}`;
    const generationConfig = {
        // JSON mode only: the shape goes in the app's prompt (no schema field is sent).
        ...(input.schema ? { responseMimeType: 'application/json' } : {}),
        ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
    };
    const body = {
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{
                role: 'user',
                parts: [
                    ...(input.images ?? []).map((image) => ({ inline_data: { mime_type: image.mediaType, data: image.data } })),
                    { text: input.question },
                ],
            }],
        ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
    };
    return { url, init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } };
}
export function readGeminiResponse(body, options) {
    const response = (body ?? {});
    const candidate = response.candidates?.[0];
    if (!candidate || response.promptFeedback?.blockReason || candidate.finishReason === 'SAFETY') {
        throw new AiError('refusal', 'Gemini no ha querido responder a esta pregunta.');
    }
    if (candidate.finishReason === 'MAX_TOKENS')
        throw new AiError('other', CUT_MESSAGE);
    const text = (candidate.content?.parts ?? []).map((part) => part.text ?? '').join('').trim();
    if (!text)
        throw new AiError('other', 'Gemini no ha devuelto ninguna respuesta de texto.');
    return { text, model: response.modelVersion ?? options.model };
}
// --- OpenAI -------------------------------------------------------------------------------------
const OPENAI_URL = 'https://api.openai.com/v1';
export function buildOpenAiRequest(input, options) {
    const content = input.images?.length
        ? [
            { type: 'text', text: input.question },
            ...input.images.map((image) => ({ type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.data}` } })),
        ]
        : input.question;
    const body = {
        model: options.model,
        messages: [
            { role: 'system', content: input.system },
            { role: 'user', content },
        ],
        // JSON mode only: the prompt must mention JSON and describe the shape.
        ...(input.schema ? { response_format: { type: 'json_object' } } : {}),
        ...(options.maxTokens ? { max_completion_tokens: options.maxTokens } : {}),
    };
    return {
        url: `${OPENAI_URL}/chat/completions`,
        init: { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${options.apiKey}` }, body: JSON.stringify(body) },
    };
}
export function readOpenAiResponse(body, options) {
    const response = (body ?? {});
    const choice = response.choices?.[0];
    if (choice?.message?.refusal || choice?.finish_reason === 'content_filter')
        throw new AiError('refusal', 'ChatGPT no ha querido responder a esta pregunta.');
    if (choice?.finish_reason === 'length')
        throw new AiError('other', CUT_MESSAGE);
    const text = (choice?.message?.content ?? '').trim();
    if (!text)
        throw new AiError('other', 'ChatGPT no ha devuelto ninguna respuesta de texto.');
    return { text, model: response.model ?? options.model };
}
// --- Model lists --------------------------------------------------------------------------------
// Models in the OpenAI list that are not suitable for chat (voice, images, embeddings…).
const OPENAI_NON_CHAT = /(embedding|tts|whisper|dall-e|moderation|transcribe|realtime|audio|image|search|babbage|davinci)/i;
export function buildModelsRequest(provider, apiKey) {
    if (provider === 'anthropic')
        return { url: `${ANTHROPIC_URL}/models?limit=100`, init: { headers: anthropicHeaders(apiKey, false) } };
    if (provider === 'gemini')
        return { url: `${GEMINI_URL}/models?pageSize=1000&key=${encodeURIComponent(apiKey)}`, init: { headers: {} } };
    return { url: `${OPENAI_URL}/models`, init: { headers: { authorization: `Bearer ${apiKey}` } } };
}
/** Sorted, unique model ids that can answer questions. */
export function readModelsResponse(provider, body) {
    let models;
    if (provider === 'gemini') {
        const list = body?.models ?? [];
        models = list
            .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
            .map((model) => model.name.replace(/^models\//, ''));
    }
    else {
        models = (body?.data ?? []).map((model) => model.id);
        if (provider === 'openai')
            models = models.filter((id) => !OPENAI_NON_CHAT.test(id));
    }
    return [...new Set(models)].sort();
}
// --- Common entry points ------------------------------------------------------------------------
export function buildAskRequest(provider, input, options) {
    if (provider === 'anthropic')
        return buildAnthropicRequest(input, options);
    if (provider === 'gemini')
        return buildGeminiRequest(input, options);
    return buildOpenAiRequest(input, options);
}
export function readAskResponse(provider, body, options) {
    if (provider === 'anthropic')
        return readAnthropicResponse(body, options);
    if (provider === 'gemini')
        return readGeminiResponse(body, options);
    return readOpenAiResponse(body, options);
}
export async function askAi(provider, input, options) {
    const body = await request(buildAskRequest(provider, input, options), options.timeoutMs);
    return readAskResponse(provider, body, options);
}
/** Models available with that key; also used to check the key without spending quota. */
export async function listModels(provider, apiKey) {
    return readModelsResponse(provider, await request(buildModelsRequest(provider, apiKey)));
}
// --- JSON answers -------------------------------------------------------------------------------
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Reads the JSON object of an answer requested with `schema`. Tolerates Markdown fences and text
 * around the object (Gemini and OpenAI only have a JSON mode, and some models still add them).
 */
export function parseJsonObject(text) {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
    const candidates = fenced ? [fenced[1], text] : [text];
    for (const candidate of candidates) {
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start < 0 || end <= start)
            continue;
        try {
            const value = JSON.parse(candidate.slice(start, end + 1));
            if (isPlainObject(value))
                return value;
        }
        catch {
            // Try the next candidate.
        }
    }
    throw new AiError('other', 'La IA no ha devuelto una respuesta válida.');
}
