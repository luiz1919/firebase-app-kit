import { useCallback, useRef } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'

/** True when a click on the <dialog> element landed outside its box (on the backdrop). */
export function isBackdropClick(box: { left: number; right: number; top: number; bottom: number }, x: number, y: number): boolean {
  return x < box.left || x > box.right || y < box.top || y > box.bottom
}

/**
 * A native modal <dialog> (centred, over a backdrop, focus kept inside), shared by "Acerca de" and
 * the sync status. Escape, the close button or a tap on the backdrop close it. A tap on the
 * dialog's own padding does not: the click target is the dialog itself in both cases, so the
 * position decides.
 */
export function useModalDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  const open = useCallback(() => ref.current?.showModal(), [])
  const close = useCallback(() => ref.current?.close(), [])
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    ref.current?.close()
  }, [])
  const onClick = useCallback((event: MouseEvent<HTMLDialogElement>) => {
    const dialog = ref.current
    if (dialog && event.target === dialog && isBackdropClick(dialog.getBoundingClientRect(), event.clientX, event.clientY)) dialog.close()
  }, [])
  return { open, close, dialogProps: { ref, onKeyDown, onClick } }
}
