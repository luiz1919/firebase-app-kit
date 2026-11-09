#!/usr/bin/env node
// firebase-app-kit command line, run from an app's root:
//   npx firebase-app-kit rules                 updates the kit blocks in firestore.rules
//   npx firebase-app-kit rules feedback        ...and adds the "feedback" block if it is missing
//   npx firebase-app-kit rules --file x.rules  works on another rules file
import { RULES_SNIPPETS, syncRulesFile } from '../dist/rules.js'

const USAGE = `Usage: npx firebase-app-kit rules [${RULES_SNIPPETS.join('|')} ...] [--file firestore.rules]`
const [command, ...rest] = process.argv.slice(2)

if (command !== 'rules') {
  console.error(USAGE)
  process.exit(2)
}

let file = 'firestore.rules'
const add = []
for (let index = 0; index < rest.length; index += 1) {
  if (rest[index] === '--file' && rest[index + 1]) file = rest[++index]
  else if (RULES_SNIPPETS.includes(rest[index])) add.push(rest[index])
  else {
    console.error(`Unknown argument: ${rest[index]}\n${USAGE}`)
    process.exit(2)
  }
}

try {
  const { updated, added } = syncRulesFile(file, add)
  if (updated.length === 0 && added.length === 0) console.log(`✅ ${file}: the firebase-app-kit rules are up to date.`)
  for (const name of added) console.log(`➕ ${file}: added the "${name}" rules.`)
  for (const name of updated) console.log(`🔄 ${file}: updated the "${name}" rules.`)
  if (updated.length > 0 || added.length > 0) console.log('Next: run the rules tests, publish the rules (firebase deploy --only firestore:rules) and commit.')
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
