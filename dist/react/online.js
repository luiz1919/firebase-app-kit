import { useEffect, useState } from 'react';
/** Si el navegador tiene conexion, actualizado con los eventos online/offline. */
export function useOnline() {
    const [online, setOnline] = useState(() => navigator.onLine);
    useEffect(() => {
        const goOnline = () => setOnline(true);
        const goOffline = () => setOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);
    return online;
}
