import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useState } from 'react';
import { useEmailLogin } from '../react/auth.js';
import { EMAIL_DOMAINS } from '../utils/auth.js';
import { EyeIcon, EyeOffIcon, LogInIcon } from './icons.js';
/**
 * Email/password login form: email with the domain chips, password with a show/hide button,
 * errors and the "Entrar" (Sign in) button. The app owns the page layout and heading around it.
 */
export function LoginForm({ auth, sessionError = '' }) {
    const { email, setEmail, password, setPassword, error, submitting, emailRef, passwordRef, hasDomain, canCompleteDomain, completeDomain, submit } = useEmailLogin(auth);
    const [showPassword, setShowPassword] = useState(false);
    const id = useId();
    const message = error || sessionError;
    const errorId = `${id}-error`;
    const passwordLabel = showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';
    return (_jsxs("form", { className: "kit-login-form", onSubmit: submit, "aria-busy": submitting, children: [_jsxs("div", { className: "kit-login-field", children: [_jsx("label", { htmlFor: `${id}-email`, children: "Correo electr\u00F3nico" }), _jsx("input", { ref: emailRef, id: `${id}-email`, className: "kit-input", type: "email", name: "email", autoComplete: "username", autoCapitalize: "none", spellCheck: false, value: email, onChange: event => setEmail(event.target.value), disabled: submitting, "aria-describedby": message ? errorId : undefined, required: true, autoFocus: true }), !hasDomain && (_jsx("div", { className: "kit-domain-chips", role: "group", "aria-label": "Completar el dominio del correo", children: EMAIL_DOMAINS.map(domain => _jsxs("button", { className: "kit-chip", type: "button", onClick: () => completeDomain(domain), disabled: submitting || !canCompleteDomain, children: ["@", domain] }, domain)) }))] }), _jsxs("div", { className: "kit-login-field", children: [_jsx("label", { htmlFor: `${id}-password`, children: "Contrase\u00F1a" }), _jsxs("span", { className: "kit-password-field", children: [_jsx("input", { ref: passwordRef, id: `${id}-password`, className: "kit-input", type: showPassword ? 'text' : 'password', name: "password", autoComplete: "current-password", value: password, onChange: event => setPassword(event.target.value), disabled: submitting, "aria-describedby": message ? errorId : undefined, required: true }), _jsx("button", { className: "kit-icon-button", type: "button", onClick: () => setShowPassword(!showPassword), "aria-label": passwordLabel, "aria-pressed": showPassword, title: passwordLabel, children: showPassword ? _jsx(EyeOffIcon, {}) : _jsx(EyeIcon, {}) })] })] }), !auth && _jsx("p", { className: "kit-error", role: "alert", children: "Firebase no est\u00E1 configurado." }), message && _jsx("p", { className: "kit-error", id: errorId, role: "alert", children: message }), _jsxs("button", { className: "kit-primary-button", type: "submit", disabled: !auth || submitting, children: [_jsx(LogInIcon, {}), submitting ? 'Entrando...' : 'Entrar'] })] }));
}
