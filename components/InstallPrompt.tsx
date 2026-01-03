'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/contexts/NotificationContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const { showToast } = useNotification();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar si está en iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Detectar si ya está instalada
    const standalone = (window.matchMedia('(display-mode: standalone)').matches) ||
      ((window.navigator as any).standalone) ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Detectar evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar si ya está instalada después de la instalación
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showToast('success', '¡Aplicación instalada correctamente!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [showToast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        showToast('info', 'Para instalar en iOS, toca el botón Compartir y luego "Añadir a pantalla de inicio"');
      } else {
        showToast('info', 'La instalación no está disponible en este momento');
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        showToast('success', 'Instalación iniciada');
      } else {
        showToast('info', 'Instalación cancelada');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during installation:', error);
      showToast('error', 'Error al instalar la aplicación');
    }
  };

  // No mostrar si ya está instalada o en modo standalone
  if (isInstalled || isStandalone) {
    return null;
  }

  // Mostrar instrucciones para iOS
  if (isIOS && !deferredPrompt) {
    return (
      <div className="rounded-md bg-blue-50 border border-blue-200 p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Instalar Mealmoti
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Para instalar esta app en tu iPhone o iPad, toca el botón{' '}
              <svg
                className="inline h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>{' '}
              y luego selecciona "Añadir a pantalla de inicio".
            </p>
          </div>
          <button
            onClick={() => setDeferredPrompt(null)}
            className="ml-4 text-blue-600 hover:text-blue-800"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Mostrar botón de instalación para Android/Desktop
  if (deferredPrompt) {
    return (
      <div className="rounded-md bg-blue-50 border border-blue-200 p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Instalar Mealmoti
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Instala esta aplicación en tu dispositivo para un acceso más rápido y una mejor experiencia.
            </p>
            <button
              onClick={handleInstallClick}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Instalar aplicación
            </button>
          </div>
          <button
            onClick={() => setDeferredPrompt(null)}
            className="ml-4 text-blue-600 hover:text-blue-800"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return null;
}

