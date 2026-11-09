// Blocks of Firestore rules owned by the kit (rules/<name>.rules), pasted into each app's
// firestore.rules between markers, because Firestore rules cannot import other files:
//   // <firebase-app-kit:feedback>
//   ...
//   // </firebase-app-kit:feedback>
// `npx firebase-app-kit rules` updates them (or adds one), and the deploy fails if they are outdated.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const RULES_SNIPPETS = ['feedback'] as const
export type RulesSnippetName = (typeof RULES_SNIPPETS)[number]

const MARKER = /^\s*\/\/ <(\/?)firebase-app-kit:([\w-]+)>\s*$/

/** The kit's current block (markers included), as in rules/<name>.rules. */
export function kitRulesSnippet(name: string): string {
  if (!RULES_SNIPPETS.includes(name as RulesSnippetName)) throw new Error(`firebase-app-kit has no rules block called "${name}".`)
  return readFileSync(new URL(`../rules/${name}.rules`, import.meta.url), 'utf8').replace(/\s+$/, '')
}

interface Block {
  name: string
  /** Line indexes of the opening and closing markers. */
  start: number
  end: number
}

function findBlocks(lines: readonly string[]): Block[] {
  const blocks: Block[] = []
  let open: { name: string; start: number } | null = null
  lines.forEach((line, index) => {
    const match = MARKER.exec(line)
    if (!match) return
    const [, closing, name] = match
    if (!closing) {
      if (open) throw new Error(`firestore.rules: the block "${open.name}" is not closed before "${name}" starts.`)
      open = { name, start: index }
    } else {
      if (!open || open.name !== name) throw new Error(`firestore.rules: "// </firebase-app-kit:${name}>" has no opening marker.`)
      blocks.push({ ...open, end: index })
      open = null
    }
  })
  if (open) throw new Error(`firestore.rules: the block "${(open as { name: string }).name}" is never closed.`)
  return blocks
}

const sameText = (first: readonly string[], second: readonly string[]) =>
  first.length === second.length && first.every((line, index) => line.trimEnd() === second[index].trimEnd())

/** Names of the kit blocks in `rules` that differ from the kit's current version. */
export function outdatedRulesSnippets(rules: string, snippet: (name: string) => string = kitRulesSnippet): string[] {
  const lines = rules.split('\n')
  return findBlocks(lines)
    .filter((block) => !sameText(lines.slice(block.start, block.end + 1), snippet(block.name).split('\n')))
    .map((block) => block.name)
}

export interface RulesUpdate {
  rules: string
  updated: string[]
  added: string[]
}

/**
 * Replaces the kit blocks in `rules` with their current version and adds the `add` blocks that
 * are missing, just before the final `match /{document=**}` (the usual "deny everything else").
 */
export function updateRulesSnippets(rules: string, add: readonly string[] = [], snippet: (name: string) => string = kitRulesSnippet): RulesUpdate {
  let lines = rules.split('\n')
  const updated: string[] = []
  const blocks = findBlocks(lines)
  // From the end, so earlier line indexes stay valid.
  for (const block of [...blocks].reverse()) {
    const current = snippet(block.name).split('\n')
    if (sameText(lines.slice(block.start, block.end + 1), current)) continue
    lines = [...lines.slice(0, block.start), ...current, ...lines.slice(block.end + 1)]
    updated.unshift(block.name)
  }
  const added: string[] = []
  for (const name of add) {
    if (blocks.some((block) => block.name === name) || added.includes(name)) continue
    const catchAll = lines.findIndex((line) => line.trim().startsWith('match /{document=**}'))
    if (catchAll === -1) {
      throw new Error(`firestore.rules has no "match /{document=**}" to add the "${name}" block before: add its two marker lines by hand inside match /databases/{database}/documents and run the command again.`)
    }
    const gap = catchAll > 0 && lines[catchAll - 1].trim() !== '' ? [''] : []
    lines = [...lines.slice(0, catchAll), ...gap, ...snippet(name).split('\n'), '', ...lines.slice(catchAll)]
    added.push(name)
  }
  return { rules: lines.join('\n'), updated, added }
}

/** Updates (and adds `add` to) a rules file; writes it only if something changed. */
export function syncRulesFile(path: string, add: readonly string[] = []): Omit<RulesUpdate, 'rules'> {
  const before = readFileSync(path, 'utf8')
  const { rules, updated, added } = updateRulesSnippets(before, add)
  if (rules !== before) writeFileSync(path, rules)
  return { updated, added }
}

/** Why the app's firestore.rules is not in line with the kit, or null (also without the file). */
export function rulesSnippetProblem(root: string, file = 'firestore.rules'): string | null {
  const path = join(root, file)
  if (!existsSync(path)) return null
  try {
    const outdated = outdatedRulesSnippets(readFileSync(path, 'utf8'))
    if (outdated.length === 0) return null
    return `${file} has outdated firebase-app-kit rules (${outdated.join(', ')}): run npx firebase-app-kit rules, test, publish the rules and commit.`
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}
