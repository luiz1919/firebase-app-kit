/** Domains offered to complete the email with one tap. */
export declare const EMAIL_DOMAINS: readonly ['gmail.com', 'hotmail.com', 'outlook.es', 'yahoo.es', 'icloud.com'];
/** The email already has a domain (something like "@example.com"). */
export declare const hasEmailDomain: (email: string) => boolean;
/**
 * There is already a valid username before the @ (unaccented letters, digits and . _ - + etc.):
 * until then it makes no sense to offer the domains.
 */
export declare const canCompleteEmailDomain: (email: string) => boolean;
/** Replaces whatever follows the @ with the chosen domain. */
export declare const completeEmailDomain: (email: string, domain: string) => string;
/**
 * User-facing message (in Spanish) for a Firebase Auth error. It checks the code, not the class
 * (FirebaseError), to avoid depending on Firebase.
 */
export declare function authErrorMessage(error: unknown): string;
