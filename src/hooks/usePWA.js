import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWA = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false);

    const {
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            if (r) {
                setInterval(() => {
                    r.update();
                }, 15 * 60 * 1000);
            }
        }
    });

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsStandalone(true);
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        
        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setIsStandalone(true);
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    return {
        isOnline,
        deferredPrompt,
        isStandalone,
        updateServiceWorker
    };
};
