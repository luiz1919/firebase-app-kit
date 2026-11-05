import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { authErrorMessage, canCompleteEmailDomain, completeEmailDomain, hasEmailDomain } from "../utils/auth.js";
/** Sigue la sesion de Firebase Auth. */
export function useAuthUser(auth) {
    const [state, setState] = useState({ user: null, ready: !auth, error: '' });
    useEffect(() => {
        if (!auth)
            return;
        return onAuthStateChanged(auth, (current) => setState({ user: current && !current.isAnonymous ? current : null, ready: true, error: '' }), () => setState({
            user: null,
            ready: true,
            error: 'No se ha podido verificar la sesión. Recarga la página e inténtalo de nuevo.',
        }));
    }, [auth]);
    return state;
}
/**
 * Estado y acciones del formulario de inicio de sesion con correo y contrasena. La app pone el
 * HTML: conecta `emailRef` y `passwordRef` a los campos, `submit` al formulario y muestra
 * `EMAIL_DOMAINS` (de firebase-app-kit/utils) con `completeDomain` mientras `!hasDomain`,
 * deshabilitados mientras `!canCompleteDomain`.
 */
export function useEmailLogin(auth) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const canCompleteDomain = canCompleteEmailDomain(email);
    /** Completa el dominio y pasa a la contrasena. Sin nombre de usuario valido no hace nada. */
    function completeDomain(domain) {
        if (!canCompleteDomain)
            return;
        setEmail(completeEmailDomain(email, domain));
        window.requestAnimationFrame(() => passwordRef.current?.focus());
    }
    async function submit(event) {
        event.preventDefault();
        if (!auth || submitting)
            return;
        if (!email.trim() || !password) {
            setError('Escribe tu correo y tu contraseña.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            // Si va bien, useAuthUser recibe la sesion y la app cambia de pantalla.
            await signInWithEmailAndPassword(auth, email.trim(), password);
            setPassword('');
        }
        catch (failure) {
            setError(authErrorMessage(failure));
        }
        finally {
            setSubmitting(false);
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
        /** Hay nombre de usuario valido: los chips de dominio deben estar deshabilitados mientras sea false. */
        canCompleteDomain,
        completeDomain,
        submit,
    };
}
