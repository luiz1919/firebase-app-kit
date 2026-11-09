interface RulesContext {
    firestore(): unknown;
}
/** The parts of @firebase/rules-unit-testing's RulesTestEnvironment these tests use. */
export interface RulesTestEnvironmentLike {
    authenticatedContext(uid: string, token?: {
        email?: string;
    }): RulesContext;
    unauthenticatedContext(): RulesContext;
    withSecurityRulesDisabled(callback: (context: RulesContext) => Promise<void>): Promise<void>;
    clearFirestore(): Promise<void>;
}
export interface FeedbackRulesTestOptions {
    /** The app's test environment (from initializeTestEnvironment), read when each test runs. */
    environment: () => RulesTestEnvironmentLike;
    assertSucceeds: <T>(promise: Promise<T>) => Promise<T>;
    assertFails: (promise: Promise<unknown>) => Promise<unknown>;
    /** The app's firestore.rules: also checks that it carries the kit's current feedback block. */
    rules?: string;
}
/** Registers the feedback rules tests (node:test). */
export declare function feedbackRulesTests({ environment, assertSucceeds, assertFails, rules }: FeedbackRulesTestOptions): void;
export {};
