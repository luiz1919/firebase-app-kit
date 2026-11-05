/** Dominios que se ofrecen para completar el correo con un toque. */
export declare const EMAIL_DOMAINS: readonly ["gmail.com", "hotmail.com", "outlook.es", "yahoo.es", "icloud.com"];
/** El correo ya tiene dominio (algo como "@ejemplo.com"). */
export declare const hasEmailDomain: (email: string) => boolean;
/** Sustituye lo que haya tras la @ por el dominio elegido. */
export declare const completeEmailDomain: (email: string, domain: string) => string;
/**
 * Mensaje para el usuario a partir de un error de Firebase Auth. Se mira el codigo y no la clase
 * (FirebaseError) para no depender de Firebase.
 */
export declare function authErrorMessage(error: unknown): string;
