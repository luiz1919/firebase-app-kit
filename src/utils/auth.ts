// Email and password login. No dependencies.

/** Domains offered to complete the email with one tap. */
export const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.es', 'yahoo.es', 'icloud.com'] as const

/** The email already has a domain (something like "@example.com"). */
export const hasEmailDomain = (email: string): boolean => /@[^@\s]+\.[^@\s]+$/.test(email)

/**
 * There is already a valid username before the @ (unaccented letters, digits and . _ - + etc.):
 * until then it makes no sense to offer the domains.
 */
export const canCompleteEmailDomain = (email: string): boolean =>
  /^[\w.!#$%&'*+/=?^`{|}~-]+$/.test(email.split('@')[0].trim())

/** Replaces whatever follows the @ with the chosen domain. */
export const completeEmailDomain = (email: string, domain: string): string => `${email.split('@')[0].trim()}@${domain}`

/**
 * User-facing message (in Spanish) for a Firebase Auth error. It checks the code, not the class
 * (FirebaseError), to avoid depending on Firebase.
 */
export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.'
    case 'auth/invalid-email':
      return 'Introduce un correo electrónico válido.'
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos y vuelve a probar.'
    case 'auth/network-request-failed':
      return 'Sin conexión. Para iniciar sesión necesitas internet.'
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'El acceso con correo y contraseña no está habilitado en Firebase.'
    default:
      return 'No se ha podido iniciar sesión. Inténtalo de nuevo.'
  }
}
