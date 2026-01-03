'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/contexts/NotificationContext';

type NotificationPermission = 'default' | 'granted' | 'denied';

export default function NotificationPermission() {
  const { showToast } = useNotification();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      showToast('error', 'Las notificaciones no están soportadas en tu navegador');
      return;
    }

    if (permission === 'granted') {
      showToast('info', 'Ya tienes permisos para recibir notificaciones');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        showToast('success', 'Permisos de notificación concedidos');
        // Aquí podrías registrar la suscripción para push notifications
      } else if (result === 'denied') {
        showToast('error', 'Permisos de notificación denegados');
      }
    } catch (error) {
      showToast('error', 'Error al solicitar permisos de notificación');
      console.error('Error requesting notification permission:', error);
    }
  };

  if (!isSupported) {
    return null;
  }

  if (permission === 'granted') {
    return (
      <div className="rounded-md bg-green-50 border border-green-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-green-800">
              Notificaciones activadas
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900 mb-1">
            Activar notificaciones
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            Recibe notificaciones cuando otros usuarios agreguen items a tus listas compartidas o cuando haya actualizaciones importantes.
          </p>
          <button
            onClick={requestPermission}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Activar notificaciones
          </button>
        </div>
        <button
          onClick={() => setPermission('denied')}
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

