import type { FormEvent } from 'react';
import type { Auth, User } from 'firebase/auth';
export interface AuthUserState {
    /** Usuario con sesion iniciada. Las sesiones anonimas no cuentan. */
    user: User | null;
    /** Ya se sabe si hay sesion. Sin Firebase configurado (auth null) es true desde el principio. */
    ready: boolean;
    /** Error al comprobar la sesion, o ''. */
    error: string;
}
/** Sigue la sesion de Firebase Auth. */
export declare function useAuthUser(auth: Auth | null): AuthUserState;
/**
 * Estado y acciones del formulario de inicio de sesion con correo y contrasena. La app pone el
 * HTML: conecta `emailRef` y `passwordRef` a los campos, `submit` al formulario y muestra
 * `EMAIL_DOMAINS` (de firebase-app-kit/utils) con `completeDomain` mientras `!hasDomain`.
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
    completeDomain: (domain: string) => void;
    submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};
