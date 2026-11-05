import { useEffect, useId, useRef, useState } from 'react';
/**
 * Panel que se abre con un boton (estado de sincronizacion, "Acerca de"...). Se cierra al tocar
 * fuera del boton y del panel, o con Escape (y entonces el foco vuelve al boton).
 * Conecta `buttonRef` al boton (con aria-expanded={open} y aria-controls={panelId}) y
 * `panelRef` al panel (con id={panelId}).
 */
export function usePopover() {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const buttonRef = useRef(null);
    const panelRef = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        function onPointerDown(event) {
            const target = event.target;
            if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target))
                setOpen(false);
        }
        function onKeyDown(event) {
            if (event.key !== 'Escape')
                return;
            setOpen(false);
            buttonRef.current?.focus();
        }
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);
    return {
        open,
        toggle: () => setOpen((current) => !current),
        close: () => setOpen(false),
        buttonRef,
        panelRef,
        panelId,
    };
}
