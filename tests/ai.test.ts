import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  AI_PROVIDERS, AiError, DEFAULT_AI_SETTINGS, DEFAULT_ANTHROPIC_MODEL, activeAi, askAi, isAiProviderId, listModels, parseAiSettings, parseJsonObject,
  providerName, suggestModel,
} from '../src/ai/index.ts'
import { buildAskRequest, buildModelsRequest, httpError, readAskResponse, readModelsResponse } from '../src/ai/providers.ts'
import type { AskInput, AskOptions } from '../src/ai/index.ts'

const image = { mediaType: 'image/jpeg' as const, data: 'AAAA' }
const schema = { type: 'object', properties: { word: { type: 'string' } }, required: ['word'], additionalProperties: false }
const input: AskInput = { system: 'Responde en español.', question: '¿Qué pone?' }

function bodyOf(provider: Parameters<typeof buildAskRequest>[0], ask: AskInput, options: AskOptions) {
  const { init } = buildAskRequest(provider, ask, options)
  return JSON.parse(init.body ?? '{}') as Record<string, unknown>
}

function rejects(run: () => unknown, kind: string, message?: RegExp) {
  assert.throws(run, (error: unknown) => error instanceof AiError && error.kind === kind && (!message || message.test(error.message)))
}

test('providers have names, key pages and a recognizable id', () => {
  assert.deepEqual(AI_PROVIDERS.map((provider) => provider.id), ['gemini', 'openai', 'anthropic'])
  assert.equal(providerName('anthropic'), 'Anthropic (Claude)')
  assert.equal(isAiProviderId('gemini'), true)
  assert.equal(isAiProviderId('mistral'), false)
})

test('suggestModel picks Claude\'s default, the latest Gemini flash and the latest GPT', () => {
  assert.equal(suggestModel('anthropic', ['claude-haiku-5-5', DEFAULT_ANTHROPIC_MODEL]), DEFAULT_ANTHROPIC_MODEL)
  assert.equal(suggestModel('anthropic', ['claude-haiku-5-5']), 'claude-haiku-5-5')
  assert.equal(suggestModel('gemini', ['gemini-2.5-flash', 'gemini-3-flash', 'gemini-3-flash-lite', 'gemini-3-flash-preview', 'gemini-3-pro']), 'gemini-3-flash')
  assert.equal(suggestModel('openai', ['gpt-5', 'gpt-5.1', 'gpt-5.1-realtime', 'o3']), 'gpt-5.1')
  assert.equal(suggestModel('openai', []), '')
})

test('Claude requests carry the browser headers, the fallback, effort, images and the JSON schema', () => {
  const plain = buildAskRequest('anthropic', input, { apiKey: 'sk-test', model: 'claude-opus-5-5' })
  assert.equal(plain.url, 'https://api.anthropic.com/v1/messages')
  assert.equal(plain.init.headers['x-api-key'], 'sk-test')
  assert.equal(plain.init.headers['anthropic-version'], '2026-10-21')
  assert.equal(plain.init.headers['anthropic-dangerous-direct-browser-access'], 'true')
  assert.equal(plain.init.headers['anthropic-beta'], undefined)
  assert.deepEqual(JSON.parse(plain.init.body ?? ''), { model: 'claude-opus-5-5', max_tokens: 16000, system: input.system, messages: [{ role: 'user', content: input.question }] })

  const full = buildAskRequest('anthropic', { ...input, images: [image], schema }, { apiKey: 'k', model: 'claude-opus-5-5', fallback: true, effort: 'low', maxTokens: 2000 })
  assert.equal(full.init.headers['anthropic-beta'], 'server-side-fallback-2026-07-01')
  const body = JSON.parse(full.init.body ?? '')
  assert.equal(body.max_tokens, 2000)
  assert.equal(body.fallbacks, 'default')
  assert.deepEqual(body.output_config, { effort: 'low', format: { type: 'json_schema', schema } })
  assert.deepEqual(body.messages[0].content, [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } },
    { type: 'text', text: input.question },
  ])
  for (const field of ['temperature', 'top_p', 'top_k', 'thinking']) assert.equal(field in body, false, field)
  // The fallback is only for the models that accept it.
  assert.equal(bodyOf('anthropic', input, { apiKey: 'k', model: 'claude-haiku-5-5', fallback: true }).fallbacks, undefined)
})

test('Claude answers: text, fallback note, refusal, cut and empty', () => {
  const options = { model: 'claude-opus-5-5' }
  assert.deepEqual(readAskResponse('anthropic', { model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'thinking' }, { type: 'text', text: ' Hola ' }] }, options), { text: 'Hola', model: 'claude-opus-5-5' })
  const switched = readAskResponse('anthropic', { model: 'claude-opus-4-8', stop_reason: 'end_turn', content: [{ type: 'fallback', from: { model: 'claude-opus-5-5' }, to: { model: 'claude-opus-4-8' } }, { type: 'text', text: 'Sí' }] }, options)
  assert.equal(switched.note, 'Respondió el modelo de respaldo (claude-opus-4-8).')
  rejects(() => readAskResponse('anthropic', { stop_reason: 'refusal', content: [] }, options), 'refusal')
  rejects(() => readAskResponse('anthropic', { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"wo' }] }, options), 'other', /cortado/)
  rejects(() => readAskResponse('anthropic', { stop_reason: 'end_turn', content: [] }, options), 'other')
})

test('Gemini requests put images first and use JSON mode without a schema field', () => {
  const request = buildAskRequest('gemini', { ...input, images: [image], schema }, { apiKey: 'g key', model: 'gemini-3-flash', maxTokens: 500, effort: 'low' })
  assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=g%20key')
  const body = JSON.parse(request.init.body ?? '')
  assert.deepEqual(body.contents, [{ role: 'user', parts: [{ inline_data: { mime_type: 'image/jpeg', data: 'AAAA' } }, { text: input.question }] }])
  assert.deepEqual(body.generationConfig, { responseMimeType: 'application/json', maxOutputTokens: 500 })
  assert.deepEqual(body.systemInstruction, { parts: [{ text: input.system }] })
  assert.equal('generationConfig' in bodyOf('gemini', input, { apiKey: 'k', model: 'm' }), false)
})

test('Gemini answers: text, safety block, cut and empty', () => {
  const options = { model: 'gemini-3-flash' }
  assert.deepEqual(readAskResponse('gemini', { candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }] }, finishReason: 'STOP' }], modelVersion: 'gemini-3-flash-001' }, options), { text: '{"a":1}', model: 'gemini-3-flash-001' })
  rejects(() => readAskResponse('gemini', { promptFeedback: { blockReason: 'SAFETY' } }, options), 'refusal')
  rejects(() => readAskResponse('gemini', { candidates: [{ finishReason: 'SAFETY' }] }, options), 'refusal')
  rejects(() => readAskResponse('gemini', { candidates: [{ content: { parts: [{ text: 'a' }] }, finishReason: 'MAX_TOKENS' }] }, options), 'other', /cortado/)
  rejects(() => readAskResponse('gemini', { candidates: [{ content: { parts: [] }, finishReason: 'STOP' }] }, options), 'other')
})

test('OpenAI requests send images as data URLs and use JSON mode', () => {
  const request = buildAskRequest('openai', { ...input, images: [image], schema }, { apiKey: 'sk-o', model: 'gpt-5.1', maxTokens: 800 })
  assert.equal(request.url, 'https://api.openai.com/v1/chat/completions')
  assert.equal(request.init.headers.authorization, 'Bearer sk-o')
  const body = JSON.parse(request.init.body ?? '')
  assert.deepEqual(body.messages, [
    { role: 'system', content: input.system },
    { role: 'user', content: [{ type: 'text', text: input.question }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } }] },
  ])
  assert.deepEqual(body.response_format, { type: 'json_object' })
  assert.equal(body.max_completion_tokens, 800)
  const plain = bodyOf('openai', input, { apiKey: 'k', model: 'gpt-5.1' })
  assert.equal(plain.response_format, undefined)
  assert.deepEqual((plain.messages as unknown[])[1], { role: 'user', content: input.question })
})

test('OpenAI answers: text, refusal, cut and empty', () => {
  const options = { model: 'gpt-5.1' }
  assert.deepEqual(readAskResponse('openai', { model: 'gpt-5.1-2026', choices: [{ message: { content: ' Hola ' }, finish_reason: 'stop' }] }, options), { text: 'Hola', model: 'gpt-5.1-2026' })
  rejects(() => readAskResponse('openai', { choices: [{ message: { content: null, refusal: 'No.' } }] }, options), 'refusal')
  rejects(() => readAskResponse('openai', { choices: [{ message: { content: '{"a"' }, finish_reason: 'length' }] }, options), 'other', /cortado/)
  rejects(() => readAskResponse('openai', { choices: [] }, options), 'other')
})

test('model lists are requested per provider, filtered, deduplicated and sorted', () => {
  assert.equal(buildModelsRequest('anthropic', 'k').url, 'https://api.anthropic.com/v1/models?limit=100')
  assert.equal(buildModelsRequest('gemini', 'k').url, 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=k')
  assert.equal(buildModelsRequest('openai', 'k').init.headers.authorization, 'Bearer k')
  assert.deepEqual(readModelsResponse('anthropic', { data: [{ id: 'claude-opus-5-5' }, { id: 'claude-haiku-5-5' }] }), ['claude-haiku-5-5', 'claude-opus-5-5'])
  assert.deepEqual(readModelsResponse('gemini', { models: [
    { name: 'models/gemini-3-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
  ] }), ['gemini-3-flash'])
  assert.deepEqual(readModelsResponse('openai', { data: [{ id: 'gpt-5.1' }, { id: 'whisper-1' }, { id: 'gpt-5.1' }] }), ['gpt-5.1'])
  assert.deepEqual(readModelsResponse('openai', null), [])
})

test('HTTP errors become Spanish messages without long provider texts', () => {
  assert.equal(httpError(200, {}), null)
  assert.equal(httpError(401, { error: { message: 'invalid x-api-key' } })?.kind, 'auth')
  assert.match(httpError(401, { error: { message: 'invalid x-api-key' } })?.message ?? '', /La clave no es válida o no tiene permiso: invalid x-api-key/)
  assert.equal(httpError(429, null)?.kind, 'quota')
  const long = httpError(500, { error: { message: 'x'.repeat(1000) } })
  assert.equal(long?.kind, 'other')
  assert.ok((long?.message.length ?? 0) < 340)
})

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

test('askAi and listModels go through fetch and map its failures', async () => {
  const calls: string[] = []
  globalThis.fetch = (async (url: string) => {
    calls.push(url)
    return new Response(JSON.stringify(url.includes('/models') ? { data: [{ id: 'gpt-5.1' }] } : { choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }), { status: 200 })
  }) as typeof fetch
  assert.deepEqual(await askAi('openai', input, { apiKey: 'k', model: 'gpt-5.1' }), { text: 'ok', model: 'gpt-5.1' })
  assert.deepEqual(await listModels('openai', 'k'), ['gpt-5.1'])
  assert.deepEqual(calls, ['https://api.openai.com/v1/chat/completions', 'https://api.openai.com/v1/models'])

  globalThis.fetch = (async () => new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 403 })) as typeof fetch
  await assert.rejects(askAi('anthropic', input, { apiKey: 'k', model: 'claude-opus-5-5' }), (error: unknown) => error instanceof AiError && error.kind === 'auth')
  globalThis.fetch = (async () => { throw new TypeError('Failed to fetch') }) as typeof fetch
  await assert.rejects(listModels('gemini', 'k'), (error: unknown) => error instanceof AiError && error.kind === 'network')
})

test('parseJsonObject reads plain, fenced and surrounded JSON objects', () => {
  assert.deepEqual(parseJsonObject('{"word":"draught excluder"}'), { word: 'draught excluder' })
  assert.deepEqual(parseJsonObject('```json\n{"ok": true}\n```'), { ok: true })
  assert.deepEqual(parseJsonObject('Aquí tienes: {"a": {"b": [1, 2]}} ¡Suerte!'), { a: { b: [1, 2] } })
  for (const bad of ['', 'sin json', '[1, 2]', '{"a": ', '"texto"']) {
    assert.throws(() => parseJsonObject(bad), (error: unknown) => error instanceof AiError && error.message === 'La IA no ha devuelto una respuesta válida.')
  }
})

test('parseAiSettings keeps valid providers and defaults the rest', () => {
  assert.deepEqual(parseAiSettings(undefined), DEFAULT_AI_SETTINGS)
  assert.deepEqual(parseAiSettings('garbage'), DEFAULT_AI_SETTINGS)
  const parsed = parseAiSettings({
    providers: {
      anthropic: { apiKey: 'sk-a', model: 'claude-opus-5-5', models: ['claude-opus-5-5', 7] },
      gemini: { apiKey: 'g', model: 3 },
      openai: { model: 'gpt-5.1' },
      mistral: { apiKey: 'm', model: 'x' },
    },
    lastProvider: 'gemini',
    anthropicFallback: false,
    extra: 'ignored',
  })
  assert.deepEqual(parsed, {
    providers: { gemini: { apiKey: 'g', model: '' }, anthropic: { apiKey: 'sk-a', model: 'claude-opus-5-5', models: ['claude-opus-5-5'] } },
    lastProvider: 'gemini',
    anthropicFallback: false,
  })
  assert.equal(parseAiSettings({ lastProvider: 'mistral', anthropicFallback: 'yes' }).lastProvider, null)
  assert.equal(parseAiSettings({ anthropicFallback: 'yes' }).anthropicFallback, true)
})

test('activeAi prefers the last provider when it is ready, then the first ready one', () => {
  const settings = parseAiSettings({
    providers: { gemini: { apiKey: 'g', model: '' }, openai: { apiKey: 'o', model: 'gpt-5.1' }, anthropic: { apiKey: 'a', model: 'claude-opus-5-5' } },
    lastProvider: 'anthropic',
  })
  assert.deepEqual(activeAi(settings), { provider: 'anthropic', apiKey: 'a', model: 'claude-opus-5-5' })
  assert.deepEqual(activeAi({ ...settings, lastProvider: 'gemini' }), { provider: 'openai', apiKey: 'o', model: 'gpt-5.1' })
  assert.deepEqual(activeAi({ ...settings, lastProvider: null }), { provider: 'openai', apiKey: 'o', model: 'gpt-5.1' })
  assert.equal(activeAi(DEFAULT_AI_SETTINGS), null)
})
