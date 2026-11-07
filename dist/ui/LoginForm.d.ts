import type { Auth } from 'firebase/auth';
export interface LoginFormProps {
    /** Firebase Auth, or null when Firebase is not configured (the form says so and stays disabled). */
    auth: Auth | null;
    /** Session error from useAuthUser, shown like a login error. */
    sessionError?: string;
}
/**
 * Email/password login form: email with the domain chips, password with a show/hide button,
 * errors and the "Entrar" (Sign in) button. The app owns the page layout and heading around it.
 */
export declare function LoginForm({ auth, sessionError }: LoginFormProps): import("react").JSX.Element;
