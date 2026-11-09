/** Message (in Spanish) for a Firestore write that failed; `action` is e.g. "enviar el comentario". */
export function writeErrorMessage(error, action) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'permission-denied') {
        return `No se ha podido ${action}: Firestore lo ha rechazado (permiso denegado). Puede que la app necesite actualizarse.`;
    }
    return `No se ha podido ${action}${code ? ` (${code})` : ''}. Inténtalo de nuevo.`;
}
