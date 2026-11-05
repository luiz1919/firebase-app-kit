import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import type { Auth, User } from 'firebase/auth'
import { authErrorMessage, canCompleteEmailDomain, completeEmailDomain, hasEmailDomain } from '../utils/auth.ts'

export interface AuthUserState {
  /** Signed-in user. Anonymous sessions do not count. */
  user: User | null
  /** Whether the session state is known. Without Firebase configured (auth null) it is true from the start. */
  ready: boolean
  /** Error while checking the session, or ''. */
  error: string
}

/** Tracks the Firebase Auth session. */
export function useAuthUser(auth: Auth | null): AuthUserState {
  const [state, setState] = useState<AuthUserState>({ user: null, ready: !auth, error: '' })

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(
      auth,
      (current) => setState({ user: current && !current.isAnonymous ? current : null, ready: true, error: '' }),
      () => setState({
        user: null,
        ready: true,
        error: 'No se ha podido verificar la sesión. Recarga la página e inténtalo de nuevo.',
      }),
    )
  }, [auth])

  return state
}

/**
 * State and actions of the email/password login form. The app provides the HTML: it connects
 * `emailRef` and `passwordRef` to the fields, `submit` to the form, and shows `EMAIL_DOMAINS`
 * (from firebase-app-kit/utils) with `completeDomain` while `!hasDomain`, disabled while
 * `!canCompleteDomain`.
 */
export function useEmailLogin(auth: Auth | null) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const canCompleteDomain = canCompleteEmailDomain(email)

  /** Completes the domain and moves to the password. Does nothing without a valid username. */
  function completeDomain(domain: string) {
    if (!canCompleteDomain) return
    setEmail(completeEmailDomain(email, domain))
    window.requestAnimationFrame(() => passwordRef.current?.focus())
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!auth || submitting) return
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      // On success, useAuthUser receives the session and the app switches screens.
      await signInWithEmailAndPassword(auth, email.trim(), password)
      setPassword('')
    } catch (failure) {
      setError(authErrorMessage(failure))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    submitting,
    emailRef,
    passwordRef,
    hasDomain: hasEmailDomain(email),
    /** There is a valid username: the domain chips must be disabled while this is false. */
    canCompleteDomain,
    completeDomain,
    submit,
  }
}
