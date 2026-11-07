import { useId, useState } from 'react'
import type { Auth } from 'firebase/auth'
import { useEmailLogin } from '../react/auth.ts'
import { EMAIL_DOMAINS } from '../utils/auth.ts'
import { EyeIcon, EyeOffIcon, LogInIcon } from './icons.tsx'

export interface LoginFormProps {
  /** Firebase Auth, or null when Firebase is not configured (the form says so and stays disabled). */
  auth: Auth | null
  /** Session error from useAuthUser, shown like a login error. */
  sessionError?: string
}

/**
 * Email/password login form: email with the domain chips, password with a show/hide button,
 * errors and the "Entrar" (Sign in) button. The app owns the page layout and heading around it.
 */
export function LoginForm({ auth, sessionError = '' }: LoginFormProps) {
  const { email, setEmail, password, setPassword, error, submitting, emailRef, passwordRef, hasDomain, canCompleteDomain, completeDomain, submit } = useEmailLogin(auth)
  const [showPassword, setShowPassword] = useState(false)
  const id = useId()
  const message = error || sessionError
  const errorId = `${id}-error`
  const passwordLabel = showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'

  return (
    <form className="kit-login-form" onSubmit={submit} aria-busy={submitting}>
      <div className="kit-login-field">
        <label htmlFor={`${id}-email`}>Correo electrónico</label>
        <input ref={emailRef} id={`${id}-email`} className="kit-input" type="email" name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={event => setEmail(event.target.value)} disabled={submitting} aria-describedby={message ? errorId : undefined} required autoFocus />
        {!hasDomain && (
          <div className="kit-domain-chips" role="group" aria-label="Completar el dominio del correo">
            {EMAIL_DOMAINS.map(domain => <button key={domain} className="kit-chip" type="button" onClick={() => completeDomain(domain)} disabled={submitting || !canCompleteDomain}>@{domain}</button>)}
          </div>
        )}
      </div>
      <div className="kit-login-field">
        <label htmlFor={`${id}-password`}>Contraseña</label>
        <span className="kit-password-field">
          <input ref={passwordRef} id={`${id}-password`} className="kit-input" type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={submitting} aria-describedby={message ? errorId : undefined} required />
          <button className="kit-icon-button" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={passwordLabel} aria-pressed={showPassword} title={passwordLabel}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
        </span>
      </div>
      {!auth && <p className="kit-error" role="alert">Firebase no está configurado.</p>}
      {message && <p className="kit-error" id={errorId} role="alert">{message}</p>}
      <button className="kit-primary-button" type="submit" disabled={!auth || submitting}><LogInIcon />{submitting ? 'Entrando...' : 'Entrar'}</button>
    </form>
  )
}
