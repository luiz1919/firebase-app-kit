import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useId, useState } from 'react';
import { AI_PROVIDERS, AiError, DEFAULT_ANTHROPIC_MODEL, listModels, suggestModel } from "../ai/providers.js";
function ProviderCard({ info, settings, actions }) {
    const saved = settings.providers[info.id];
    const [editingKey, setEditingKey] = useState(!saved);
    const [keyInput, setKeyInput] = useState('');
    const [models, setModels] = useState(null);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState(null);
    const id = useId();
    function saveKey(event) {
        event.preventDefault();
        const apiKey = keyInput.trim();
        if (!apiKey)
            return;
        // Claude has a recommended model; for Gemini and OpenAI it is chosen after "Probar conexión" (Test connection).
        const model = saved?.model || (info.id === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : '');
        // A different key may give access to other models: the list is rebuilt when testing the connection.
        void actions.saveProvider(info.id, { apiKey, model, models: [] });
        setKeyInput('');
        setEditingKey(false);
        setMessage({ tone: 'ok', text: 'Clave guardada. Pulsa «Probar conexión» para comprobarla y elegir modelo.' });
    }
    async function test() {
        if (!saved)
            return;
        setTesting(true);
        setMessage(null);
        try {
            const list = await listModels(info.id, saved.apiKey);
            setModels(list);
            // Without a model no questions can be asked: suggest one from the list and save it.
            const suggested = !saved.model || !list.includes(saved.model) ? suggestModel(info.id, list) : '';
            // The list is saved in the account, so the dropdown always has it, on any device.
            void actions.saveProvider(info.id, { models: list, ...(suggested ? { model: suggested } : {}) });
            setMessage({
                tone: 'ok',
                text: list.length === 0
                    ? 'Conexión correcta, pero no hay modelos disponibles.'
                    : `Conexión correcta: ${list.length} modelos disponibles.` + (suggested ? ` He elegido ${suggested}; puedes cambiarlo abajo.` : ''),
            });
        }
        catch (testError) {
            setMessage({ tone: 'error', text: testError instanceof AiError ? testError.message : 'No se ha podido comprobar la clave.' });
        }
        finally {
            setTesting(false);
        }
    }
    function remove() {
        if (!window.confirm(`¿Borrar la clave de ${info.name}?`))
            return;
        void actions.removeProvider(info.id);
        setModels(null);
        setEditingKey(true);
        setMessage(null);
    }
    // The saved model is shown even if the list has not been requested yet.
    const modelOptions = [...new Set([...(saved?.model ? [saved.model] : []), ...(models ?? saved?.models ?? [])])].sort();
    return (_jsxs("li", { className: "kit-ai-card", children: [_jsxs("div", { className: "kit-ai-card-head", children: [_jsx("h2", { className: "kit-ai-card-title", children: info.name }), _jsx("span", { className: `kit-badge${info.cost.startsWith('Nivel gratuito') ? ' kit-badge-ok' : ''}`, children: info.cost })] }), _jsxs("p", { className: "kit-ai-meta", children: [saved ? `Clave guardada: ••••${saved.apiKey.slice(-4)}` : 'Sin configurar', saved?.model && ` · Modelo: ${saved.model}`] }), saved && !saved.model && _jsx("p", { className: "kit-notice kit-notice-warn", children: "Falta elegir el modelo: pulsa \u00ABProbar conexi\u00F3n\u00BB." }), editingKey ? (_jsxs("form", { className: "kit-ai-form", onSubmit: saveKey, noValidate: true, children: [_jsxs("div", { className: "kit-field", children: [_jsx("label", { htmlFor: `${id}-key`, children: "Clave de la API" }), _jsx("input", { id: `${id}-key`, className: "kit-input", type: "password", autoComplete: "off", spellCheck: false, value: keyInput, onChange: (event) => setKeyInput(event.target.value), "aria-describedby": `${id}-key-hint` }), _jsxs("p", { id: `${id}-key-hint`, className: "kit-hint", children: ["Se crea en", ' ', _jsx("a", { className: "kit-link", href: info.keyPage, target: "_blank", rel: "noopener noreferrer", children: info.keyPage.replace('https://', '') }), ". Se guarda en tu cuenta, no en el c\u00F3digo ni en las copias."] })] }), _jsxs("div", { className: "kit-actions", children: [_jsx("button", { type: "submit", className: "kit-primary-button", disabled: !keyInput.trim(), children: "Guardar clave" }), saved && _jsx("button", { type: "button", className: "kit-secondary-button", onClick: () => setEditingKey(false), children: "Cancelar" })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "kit-actions", children: [_jsx("button", { type: "button", className: "kit-secondary-button", disabled: testing, onClick: () => void test(), children: testing ? 'Comprobando…' : 'Probar conexión' }), _jsx("button", { type: "button", className: "kit-link-button", onClick: () => setEditingKey(true), children: "Cambiar clave" }), _jsx("button", { type: "button", className: "kit-link-button kit-link-danger", onClick: remove, children: "Borrar clave" })] }), modelOptions.length > 0 && (_jsxs("div", { className: "kit-field", children: [_jsx("label", { htmlFor: `${id}-model`, children: "Modelo" }), _jsxs("select", { id: `${id}-model`, className: "kit-input", value: saved?.model ?? '', onChange: (event) => void actions.saveProvider(info.id, { model: event.target.value }), children: [!saved?.model && _jsx("option", { value: "", children: "Elige un modelo" }), modelOptions.map((model) => _jsx("option", { value: model, children: model }, model))] })] })), saved && !saved.model && !models && !saved.models?.length && _jsx("p", { className: "kit-hint", children: "Pulsa \u00ABProbar conexi\u00F3n\u00BB para ver los modelos disponibles con tu clave." }), info.id === 'anthropic' && (_jsxs("label", { className: "kit-checkbox", children: [_jsx("input", { type: "checkbox", checked: settings.anthropicFallback, onChange: (event) => void actions.setAnthropicFallback(event.target.checked) }), "Si Claude rechaza la pregunta, reintentar con otro modelo de Anthropic (recomendado)"] }))] })), _jsx("div", { role: "status", children: message && _jsx("p", { className: `kit-notice kit-notice-${message.tone}`, children: message.text }) })] }));
}
/**
 * One card per AI provider: save, change or delete the key, "Probar conexión" (Test connection,
 * which lists the models without spending quota and suggests one) and the model. The app owns the
 * page heading and the privacy notes around it, and stores the settings through `actions`.
 */
export function AiSettingsPanel({ settings, actions }) {
    return (_jsx("ul", { className: "kit-ai-list", children: AI_PROVIDERS.map((info) => _jsx(ProviderCard, { info: info, settings: settings, actions: actions }, info.id)) }));
}
