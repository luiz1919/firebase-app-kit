import type { FormEvent } from 'react';
import type { Auth, User } from 'firebase/auth';
export interface AuthUserState {
    /** Signed-in user. Anonymous sessions do not count. */
    user: User | null;
    /** Whether the session state is known. Without Firebase configured (auth null) it is true from the start. */
    ready: boolean;
    /** Error while checking the session, or ''. */
    error: string;
}
/** Tracks the Firebase Auth session. */
export declare function useAuthUser(auth: Auth | null): AuthUserState;
/**
 * State and actions of the email/password login form. The app provides the HTML: it connects
 * `emailRef` and `passwordRef` to the fields, `submit` to the form, and shows `EMAIL_DOMAINS`
 * (from firebase-app-kit/utils) with `completeDomain` while `!hasDomain`, disabled while
 * `!canCompleteDomain`.
 */
export declare function useEmailLogin(auth: Auth | null): {
    email: string;
    setEmail: import("react").Dispatch<import("react").SetStateAction<string>>;
    password: string;
    setPassword: import("react").Dispatch<import("react").SetStateAction<string>>;
    error: string;
    submitting: boolean;
    emailRef: import("react").RefObject<HTMLInputElement | null>;
    passwordRef: import("react").RefObject<HTMLInputElement | null>;
    hasDomain: boolean;
    /** There is a valid username: the domain chips must be disabled while this is false. */
    canCompleteDomain: boolean;
    completeDomain: (domain: string) => void;
    submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};
