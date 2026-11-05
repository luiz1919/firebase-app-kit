/**
 * Panel que se abre con un boton (estado de sincronizacion, "Acerca de"...). Se cierra al tocar
 * fuera del boton y del panel, o con Escape (y entonces el foco vuelve al boton).
 * Conecta `buttonRef` al boton (con aria-expanded={open} y aria-controls={panelId}) y
 * `panelRef` al panel (con id={panelId}).
 */
export declare function usePopover(): {
    open: boolean;
    toggle: () => void;
    close: () => void;
    buttonRef: import("react").RefObject<HTMLButtonElement | null>;
    panelRef: import("react").RefObject<HTMLDivElement | null>;
    panelId: string;
};
