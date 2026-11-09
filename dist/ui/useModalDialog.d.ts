import type { KeyboardEvent, MouseEvent } from 'react';
/** True when a click on the <dialog> element landed outside its box (on the backdrop). */
export declare function isBackdropClick(box: {
    left: number;
    right: number;
    top: number;
    bottom: number;
}, x: number, y: number): boolean;
/**
 * A native modal <dialog> (centred, over a backdrop, focus kept inside), shared by "Acerca de" and
 * the sync status. Escape, the close button or a tap on the backdrop close it. A tap on the
 * dialog's own padding does not: the click target is the dialog itself in both cases, so the
 * position decides.
 */
export declare function useModalDialog(): {
    open: () => void | undefined;
    close: () => void | undefined;
    dialogProps: {
        ref: import("react").RefObject<HTMLDialogElement | null>;
        onKeyDown: (event: KeyboardEvent<HTMLDialogElement>) => void;
        onClick: (event: MouseEvent<HTMLDialogElement>) => void;
    };
};
