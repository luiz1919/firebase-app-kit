import assert from 'node:assert/strict'
import { test } from 'node:test'
import { serverTimestamp } from 'firebase/firestore'
import { feedbackDraftProblem, feedbackManagementUpdate } from '../src/feedback.ts'
import { appendErrorEntry, describeError } from '../src/utils/errorLog.ts'
import {
  cleanFeedbackText, cleanFeedbackTitle, feedbackAuthorName, feedbackContextEntries, feedbackFromData, feedbackTitle, feedbackToMarkdown,
  feedbackWords, githubIssueUrl, hasUnreadReply, similarFeedback, sortFeedback, splitUntitledFeedback,
} from '../src/utils/feedback.ts'
import type { FeedbackItem } from '../src/utils/feedback.ts'
import { fitWithin } from '../src/utils/image.ts'

const item = (overrides: Partial<FeedbackItem> = {}): FeedbackItem => ({
  id: 'f1', kind: 'bug', title: 'La lista no se guarda', text: 'Al volver a abrirla está vacía', status: 'new', createdBy: 'ana', createdByEmail: 'ana@example.com',
  createdAt: new Date(2026, 10, 9), editedAt: null, appVersion: '1.2.3', screenshotCount: 0, hasDiagnostics: false, reply: '',
  repliedAt: null, replyRead: true, resolvedVersion: '', sending: false, ...overrides,
})

test('feedbackFromData reads Timestamps and falls back to safe values', () => {
  const when = new Date(2026, 10, 9, 10, 30)
  const parsed = feedbackFromData('x', {
    kind: 'idea', title: ' Modo   oscuro ', text: 'Para la noche', status: 'done', createdBy: 'u1', createdByEmail: 'u1@example.com',
    createdAt: { toDate: () => when }, editedAt: null, appVersion: '0.5.0', screenshotCount: 2, hasDiagnostics: true,
    reply: 'Hecho', repliedAt: { toDate: () => when }, replyRead: false, resolvedVersion: '0.6.0',
  })
  assert.deepEqual(parsed, {
    id: 'x', kind: 'idea', title: 'Modo oscuro', text: 'Para la noche', status: 'done', createdBy: 'u1', createdByEmail: 'u1@example.com', createdAt: when,
    editedAt: null, appVersion: '0.5.0', screenshotCount: 2, hasDiagnostics: true, reply: 'Hecho', repliedAt: when, replyRead: false,
    resolvedVersion: '0.6.0', sending: false,
  })
  const odd = feedbackFromData('y', { kind: 'question', status: 'closed', screenshotCount: 9, text: 3 })
  assert.deepEqual([odd.kind, odd.status, odd.screenshotCount, odd.title, odd.text, odd.createdAt, odd.replyRead], ['other', 'new', 3, '', '', null, true])
})

test('feedback from before titles: the first line is the title and the rest the description', () => {
  const untitled = feedbackFromData('z', { kind: 'bug', text: '  La lista no se guarda \n\nAl volver está vacía\nsiempre' })
  assert.deepEqual([untitled.title, untitled.text], ['La lista no se guarda', 'Al volver está vacía\nsiempre'])
  assert.deepEqual(splitUntitledFeedback('Solo una línea'), { title: 'Solo una línea', text: '' })
  const long = 'x'.repeat(130)
  assert.deepEqual(splitUntitledFeedback(`${long}\nresto`), { title: `${'x'.repeat(119)}…`, text: `${long}\nresto` })
})

test('titles, author names and text cleaning', () => {
  assert.equal(feedbackTitle('\n  Primera línea  \nsegunda'), 'Primera línea')
  assert.equal(feedbackTitle('x'.repeat(100), 10), `${'x'.repeat(9)}…`)
  assert.equal(feedbackAuthorName('luis.perez@gmail.com'), 'luis.perez')
  assert.equal(feedbackAuthorName(''), 'Alguien')
  assert.equal(cleanFeedbackText('  uno\r\n\r\n\r\n\r\ndos  '), 'uno\n\ndos')
  assert.equal(cleanFeedbackTitle('  Modo \n oscuro  '), 'Modo oscuro')
})

test('drafts need a title, short texts and at most three screenshots; the description is optional', () => {
  assert.equal(feedbackDraftProblem({ title: '   \n ', text: 'Algo' }), 'Escribe un título.')
  assert.match(feedbackDraftProblem({ title: 'x'.repeat(121), text: '' }) ?? '', /título es demasiado largo/)
  assert.match(feedbackDraftProblem({ title: 'Hola', text: 'x'.repeat(4001) }) ?? '', /descripción es demasiado larga/)
  assert.match(feedbackDraftProblem({ title: 'Hola', text: '' }, 4) ?? '', /hasta 3 capturas/)
  assert.equal(feedbackDraftProblem({ title: 'Hola', text: '' }, 3), null)
})

test('newest first, with items waiting for their server date on top', () => {
  const sorted = sortFeedback([
    item({ id: 'old', createdAt: new Date(2026, 0, 1) }),
    item({ id: 'pending', createdAt: null }),
    item({ id: 'new', createdAt: new Date(2026, 5, 1) }),
  ])
  assert.deepEqual(sorted.map((entry) => entry.id), ['pending', 'new', 'old'])
})

test('unread replies only count for their author', () => {
  const answered = item({ reply: 'Arreglado', replyRead: false })
  assert.equal(hasUnreadReply(answered, 'ana'), true)
  assert.equal(hasUnreadReply(answered, 'pepe'), false)
  assert.equal(hasUnreadReply({ ...answered, replyRead: true }, 'ana'), false)
})

test('similar feedback ignores case, accents, plurals and common words', () => {
  assert.deepEqual([...feedbackWords('La sincronización de las LISTAS falla')].sort(), ['falla', 'lista', 'sincr'])
  const items = [
    item({ id: 'sync', title: 'Las listas no se sincronizan', text: 'Entre el móvil y el ordenador' }),
    item({ id: 'dark', kind: 'idea', title: 'Modo oscuro', text: 'Para usarla de noche' }),
    item({ id: 'closed-sync', status: 'done', title: 'No sincroniza', text: 'La lista del móvil' }),
  ]
  assert.deepEqual(similarFeedback('la lista no sincroniza', items).map((entry) => entry.id), ['sync', 'closed-sync'])
  assert.deepEqual(similarFeedback('oscuro', items).map((entry) => entry.id), ['dark'])
  assert.deepEqual(similarFeedback('que para con', items), [])
  assert.deepEqual(similarFeedback('lista sincroniza', items, { excludeId: 'sync', limit: 1 }).map((entry) => entry.id), ['closed-sync'])
})

test('technical details: known labels first, booleans in Spanish, empty values left out', () => {
  assert.deepEqual(feedbackContextEntries({ extra: 'x', online: false, version: '1.0.0', commit: '' }), [
    ['Versión', '1.0.0'], ['Con conexión', 'no'], ['extra', 'x'],
  ])
})

test('the Markdown report has the text, the facts, the reply and the technical details', () => {
  const markdown = feedbackToMarkdown(item({ reply: 'Mirándolo', screenshotCount: 2 }), {
    appName: 'Labia',
    diagnostics: { context: { route: '#/despensa' }, errors: [{ at: '2026-11-09T10:00:00.000Z', message: 'TypeError: boom' }] },
  })
  assert.match(markdown, /^## La lista no se guarda\n\nAl volver a abrirla está vacía\n/)
  assert.match(feedbackToMarkdown(item({ text: '' }), { appName: 'Labia' }), /^## La lista no se guarda\n\n- App: Labia/)
  for (const part of ['- App: Labia v1.2.3', '- Kind: Algo no funciona (bug)', '- Author: ana,', '- Firestore: feedback/f1', '- Screenshots: 2', '### Reply\n\nMirándolo', '- Pantalla de la app: #/despensa', '2026-11-09T10:00:00.000Z TypeError: boom']) {
    assert.ok(markdown.includes(part), part)
  }
})

test('GitHub issue links carry title, body and label, and fit in a URL', () => {
  const url = new URL(githubIssueUrl('luiz1919/labia-app', item({ kind: 'idea', title: 'Modo oscuro', text: 'Por la noche' }), { appName: 'Labia' }))
  assert.equal(`${url.origin}${url.pathname}`, 'https://github.com/luiz1919/labia-app/issues/new')
  assert.equal(url.searchParams.get('title'), 'Modo oscuro')
  assert.equal(url.searchParams.get('labels'), 'enhancement')
  assert.match(url.searchParams.get('body') ?? '', /Por la noche/)
  assert.equal(new URL(githubIssueUrl('a/b', item({ kind: 'other' }), { appName: 'X' })).searchParams.get('labels'), null)

  const errors = Array.from({ length: 20 }, (_, index) => ({ at: '2026-11-09T10:00:00.000Z', message: `Error ${index} ${'x'.repeat(400)}` }))
  const long = githubIssueUrl('a/b', item({ text: 'Texto largo '.repeat(800) }), { appName: 'X', diagnostics: { context: { version: '1' }, errors } })
  assert.ok(long.length <= 7500, String(long.length))
  assert.match(new URL(long).searchParams.get('body') ?? '', /^Texto largo/)
})

test('admin changes: a new reply is stamped and unread for its author, a cleared one is not', () => {
  const answer = feedbackManagementUpdate(item(), { status: 'done', reply: ' Arreglado \n', resolvedVersion: ' 1.2.4 ' }, 'admin')
  assert.deepEqual({ ...answer, repliedAt: undefined }, { status: 'done', resolvedVersion: '1.2.4', reply: 'Arreglado', repliedAt: undefined, replyRead: false })
  assert.ok((answer.repliedAt as ReturnType<typeof serverTimestamp>).isEqual(serverTimestamp()))
  assert.equal(feedbackManagementUpdate(item({ createdBy: 'admin' }), { status: 'new', reply: 'Nota', resolvedVersion: '' }, 'admin').replyRead, true)
  assert.deepEqual(feedbackManagementUpdate(item({ reply: 'Vieja' }), { status: 'declined', reply: '', resolvedVersion: '' }, 'admin'), {
    status: 'declined', resolvedVersion: '', reply: '', repliedAt: null, replyRead: true,
  })
  assert.deepEqual(feedbackManagementUpdate(item({ reply: 'Igual' }), { status: 'in-progress', reply: 'Igual', resolvedVersion: '' }, 'admin'), {
    status: 'in-progress', resolvedVersion: '',
  })
})

test('the error log keeps the newest entries, shortened to one line', () => {
  let list = appendErrorEntry([], 'primero', new Date('2026-11-09T10:00:00Z'), 2)
  list = appendErrorEntry(list, 'segundo\n  con salto', new Date('2026-11-09T10:01:00Z'), 2)
  list = appendErrorEntry(list, 'tercero', new Date('2026-11-09T10:02:00Z'), 2)
  assert.deepEqual(list, [
    { at: '2026-11-09T10:01:00.000Z', message: 'segundo con salto' },
    { at: '2026-11-09T10:02:00.000Z', message: 'tercero' },
  ])
  assert.equal(appendErrorEntry([], '   ').length, 0)
  assert.equal(appendErrorEntry([], 'x'.repeat(900))[0].message.length, 500)
  assert.match(describeError(new TypeError('boom')), /^TypeError: boom \(.+\)$/)
  assert.equal(describeError({ code: 'permission-denied' }), '{"code":"permission-denied"}')
})

test('images fit within the largest side without being enlarged', () => {
  assert.deepEqual(fitWithin(1170, 2532, 1600), { width: 739, height: 1600 })
  assert.deepEqual(fitWithin(800, 600, 1600), { width: 800, height: 600 })
})
