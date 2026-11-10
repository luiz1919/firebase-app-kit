import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from 'react';
import { switchAppEnv } from '../env.js';
const LABELS = { prod: 'Real', dev: 'Pruebas' };
const SWITCH_QUESTIONS = {
    dev: '¿Cambiar a Pruebas? La app se recargará con la base de datos de pruebas (otro proyecto de Firebase): tendrás que iniciar sesión con tu usuario de pruebas.',
    prod: '¿Volver a Real? La app se recargará con tus datos reales.',
};
function progressText(verb, { done, total }) {
    return `${verb}… ${done.toLocaleString('es')} de ${total.toLocaleString('es')}`;
}
/** "Entorno" (Environment) section of "Acerca de" (About): Real / Pruebas switch and test data. */
export function EnvironmentPanel({ environment, canSwitch, testData }) {
    const [size, setSize] = useState(testData?.sizes[0]?.id ?? '');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const statusRef = useRef(null);
    const titleId = useId();
    // On a phone the dialog scrolls: keep the progress and the result in view.
    useEffect(() => {
        if (status)
            statusRef.current?.scrollIntoView({ block: 'nearest' });
    }, [status]);
    const isDev = environment.current === 'dev';
    // In "Pruebas" the way back is always there (the dev project may have no admins).
    if (!environment.devAvailable || (!isDev && !canSwitch))
        return null;
    function change() {
        const target = isDev ? 'prod' : 'dev';
        if (window.confirm(SWITCH_QUESTIONS[target]))
            switchAppEnv(target);
    }
    async function run(verb, action) {
        setBusy(true);
        setStatus({ tone: 'info', text: `${verb}…` });
        try {
            const summary = await action((progress) => setStatus({ tone: 'info', text: progressText(verb, progress) }));
            setStatus({ tone: 'ok', text: summary });
        }
        catch (error) {
            setStatus({ tone: 'error', text: error instanceof Error && error.message ? error.message : 'No se ha podido terminar. Revisa la conexión.' });
        }
        finally {
            setBusy(false);
        }
    }
    function clear() {
        if (!testData || !window.confirm('¿Borrar todos tus datos de Pruebas? Los datos reales no se tocan.'))
            return;
        void run('Borrando', testData.clear);
    }
    return (_jsxs("section", { className: "kit-env-panel", "aria-labelledby": titleId, children: [_jsx("h3", { id: titleId, children: "Entorno" }), _jsxs("p", { className: "kit-env-current", children: [_jsx("span", { className: `kit-env-badge kit-env-badge-${environment.current}`, children: LABELS[environment.current] }), _jsx("code", { children: environment.projectId })] }), _jsx("p", { className: "kit-env-hint", children: isDev
                    ? 'Estás usando la base de datos de pruebas: puedes crear y borrar lo que quieras sin tocar tus datos reales.'
                    : 'Pruebas usa otra base de datos, para probar sin tocar tus datos reales.' }), _jsx("button", { className: "kit-secondary-button", type: "button", onClick: change, disabled: busy, children: isDev ? 'Volver a Real' : 'Cambiar a Pruebas' }), isDev && testData && (_jsxs("div", { className: "kit-env-test-data", children: [_jsx("h3", { children: "Datos de prueba" }), _jsxs("fieldset", { className: "kit-env-sizes", disabled: busy, children: [_jsx("legend", { children: "Cantidad" }), testData.sizes.map((option) => (_jsxs("label", { className: "kit-env-size", children: [_jsx("input", { type: "radio", name: `${titleId}-size`, value: option.id, checked: size === option.id, onChange: () => setSize(option.id) }), _jsx("span", { children: option.label })] }, option.id)))] }), _jsx("button", { className: "kit-primary-button", type: "button", disabled: busy || !size, onClick: () => void run('Creando datos', (onProgress) => testData.generate(size, onProgress)), children: "Generar datos de prueba" }), _jsx("button", { className: "kit-secondary-button kit-env-clear", type: "button", disabled: busy, onClick: clear, children: "Borrar mis datos de prueba" }), _jsx("div", { ref: statusRef, role: "status", "aria-live": "polite", children: status && _jsx("p", { className: `kit-notice kit-notice-${status.tone === 'info' ? 'warn' : status.tone}`, children: status.text }) }), _jsx("p", { className: "kit-env-hint", children: "Necesita conexi\u00F3n. Cada vez que generas, se a\u00F1aden datos nuevos a los que ya hay." })] }))] }));
}
