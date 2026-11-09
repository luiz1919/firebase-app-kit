import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { kitRulesSnippet, outdatedRulesSnippets, rulesSnippetProblem, syncRulesFile, updateRulesSnippets } from '../src/rules.ts'

const BLOCK = ['    // <firebase-app-kit:feedback>', '    match /feedback/{id} { allow read: if true; }', '    // </firebase-app-kit:feedback>'].join('\n')
const snippet = (name: string) => {
  assert.equal(name, 'feedback')
  return BLOCK
}
const appRules = (inside: string) => `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} { allow read: if request.auth.uid == uid; }
${inside}
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`

test('the kit ships the feedback block with its markers and ASCII only (TripPlanner rules are ASCII)', () => {
  const block = kitRulesSnippet('feedback')
  assert.match(block, /^ {4}\/\/ <firebase-app-kit:feedback>\n/)
  assert.match(block, /\n {4}\/\/ <\/firebase-app-kit:feedback>$/)
  assert.match(block, /^[\t\n -~]*$/)
  assert.throws(() => kitRulesSnippet('nope'), /no rules block called "nope"/)
})

test('a missing block is added before the final catch-all; an outdated one is replaced', () => {
  const added = updateRulesSnippets(appRules(''), ['feedback'], snippet)
  assert.deepEqual([added.added, added.updated], [['feedback'], []])
  assert.ok(added.rules.includes(`${BLOCK}\n\n    match /{document=**} {`))
  assert.deepEqual(outdatedRulesSnippets(added.rules, snippet), [])
  // Right after a closing brace, a blank line keeps it apart.
  const tight = updateRulesSnippets(appRules('').replace('\n\n    match /{document=**}', '\n    match /{document=**}'), ['feedback'], snippet)
  assert.ok(tight.rules.includes(`uid; }\n\n${BLOCK}\n\n    match /{document=**} {`))

  const outdated = appRules(['    // <firebase-app-kit:feedback>', '    match /feedback/{id} { allow read: if false; }', '    // </firebase-app-kit:feedback>', ''].join('\n'))
  assert.deepEqual(outdatedRulesSnippets(outdated, snippet), ['feedback'])
  const updated = updateRulesSnippets(outdated, ['feedback'], snippet)
  assert.deepEqual([updated.added, updated.updated], [[], ['feedback']])
  assert.equal(updated.rules, appRules(`${BLOCK}\n`))
  // Up to date: nothing changes (trailing spaces do not count).
  const current = appRules(`${BLOCK.replace('if true; }', 'if true; }   ')}\n`)
  assert.deepEqual(updateRulesSnippets(current, [], snippet), { rules: current, added: [], updated: [] })
})

test('broken markers and rules without a catch-all are reported', () => {
  assert.throws(() => outdatedRulesSnippets('    // <firebase-app-kit:feedback>\n', snippet), /never closed/)
  assert.throws(() => outdatedRulesSnippets('    // </firebase-app-kit:feedback>\n', snippet), /no opening marker/)
  assert.throws(() => updateRulesSnippets('service cloud.firestore {}', ['feedback'], snippet), /has no "match \/\{document=\*\*\}"/)
})

test('syncRulesFile and the deploy check work on the app files with the real kit block', () => {
  const root = mkdtempSync(join(tmpdir(), 'kit-rules-'))
  const path = join(root, 'firestore.rules')
  assert.equal(rulesSnippetProblem(root), null, 'no rules file: nothing to check')
  writeFileSync(path, appRules(''))
  assert.equal(rulesSnippetProblem(root), null, 'no kit block: nothing to check')
  assert.deepEqual(syncRulesFile(path, ['feedback']), { updated: [], added: ['feedback'] })
  assert.equal(rulesSnippetProblem(root), null)
  writeFileSync(path, readFileSync(path, 'utf8').replace("['bug', 'idea', 'other']", "['bug']"))
  assert.match(rulesSnippetProblem(root) ?? '', /outdated firebase-app-kit rules \(feedback\): run npx firebase-app-kit rules/)
  assert.deepEqual(syncRulesFile(path), { updated: ['feedback'], added: [] })
  assert.equal(rulesSnippetProblem(root), null)
})
