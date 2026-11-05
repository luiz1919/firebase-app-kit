/**
 * Panel opened by a button (sync status, "Acerca de" (About)...). It closes on a tap outside
 * the button and the panel, or with Escape (and then focus returns to the button).
 * Connect `buttonRef` to the button (with aria-expanded={open} and aria-controls={panelId}) and
 * `panelRef` to the panel (with id={panelId}).
 */
export declare function usePopover(): {
    open: boolean;
    toggle: () => void;
    close: () => void;
    buttonRef: import("react").RefObject<HTMLButtonElement | null>;
    panelRef: import("react").RefObject<HTMLDivElement | null>;
    panelId: string;
};
