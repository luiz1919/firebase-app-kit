export declare const RULES_SNIPPETS: readonly ['feedback'];
export type RulesSnippetName = (typeof RULES_SNIPPETS)[number];
/** The kit's current block (markers included), as in rules/<name>.rules. */
export declare function kitRulesSnippet(name: string): string;
/** Names of the kit blocks in `rules` that differ from the kit's current version. */
export declare function outdatedRulesSnippets(rules: string, snippet?: (name: string) => string): string[];
export interface RulesUpdate {
    rules: string;
    updated: string[];
    added: string[];
}
/**
 * Replaces the kit blocks in `rules` with their current version and adds the `add` blocks that
 * are missing, just before the final `match /{document=**}` (the usual "deny everything else").
 */
export declare function updateRulesSnippets(rules: string, add?: readonly string[], snippet?: (name: string) => string): RulesUpdate;
/** Updates (and adds `add` to) a rules file; writes it only if something changed. */
export declare function syncRulesFile(path: string, add?: readonly string[]): Omit<RulesUpdate, 'rules'>;
/** Why the app's firestore.rules is not in line with the kit, or null (also without the file). */
export declare function rulesSnippetProblem(root: string, file?: string): string | null;
