import { useEffect, useId, useRef, useState } from 'react';
/**
 * Panel opened by a button (sync status, "Acerca de" (About)...). It closes on a tap outside
 * the button and the panel, or with Escape (and then focus returns to the button).
 * Connect `buttonRef` to the button (with aria-expanded={open} and aria-controls={panelId}) and
 * `panelRef` to the panel (with id={panelId}).
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
