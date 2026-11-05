// Inicio de sesion con correo y contrasena. Sin dependencias.
/** Dominios que se ofrecen para completar el correo con un toque. */
export const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.es', 'yahoo.es', 'icloud.com'];
/** El correo ya tiene dominio (algo como "@ejemplo.com"). */
export const hasEmailDomain = (email) => /@[^@\s]+\.[^@\s]+$/.test(email);
/** Sustituye lo que haya tras la @ por el dominio elegido. */
export const completeEmailDomain = (email, domain) => `${email.split('@')[0].trim()}@${domain}`;
/**
 * Mensaje para el usuario a partir de un error de Firebase Auth. Se mira el codigo y no la clase
 * (FirebaseError) para no depender de Firebase.
 */
export function authErrorMessage(error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'Correo o contraseña incorrectos.';
        case 'auth/invalid-email':
            return 'Introduce un correo electrónico válido.';
        case 'auth/user-disabled':
            return 'Esta cuenta está deshabilitada.';
        case 'auth/too-many-requests':
            return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
        case 'auth/network-request-failed':
            return 'Sin conexión. Para iniciar sesión necesitas internet.';
        case 'auth/operation-not-allowed':
        case 'auth/configuration-not-found':
            return 'El acceso con correo y contraseña no está habilitado en Firebase.';
        default:
            return 'No se ha podido iniciar sesión. Inténtalo de nuevo.';
    }
}
