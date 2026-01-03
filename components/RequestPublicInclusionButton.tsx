'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/contexts/NotificationContext';

interface RequestStatus {
  id: string;
  itemType: string;
  itemId: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  requestedBy?: {
    id: string;
    name: string;
    email: string;
  };
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface RequestPublicInclusionButtonProps {
  itemType: 'product' | 'article' | 'ingredient';
  itemId: string;
  isGeneral: boolean;
  isOwner: boolean;
}

export default function RequestPublicInclusionButton({
  itemType,
  itemId,
  isGeneral,
  isOwner,
}: RequestPublicInclusionButtonProps) {
  const { showNotification } = useNotification();
  const [requestStatus, setRequestStatus] = useState<RequestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (isOwner && !isGeneral) {
      fetchRequestStatus();
    } else {
      setLoading(false);
    }
  }, [itemType, itemId, isOwner, isGeneral]);

  const fetchRequestStatus = async () => {
    try {
      const res = await fetch(
        `/api/public-inclusion/status?itemType=${itemType}&itemId=${itemId}`
      );
      const data = await res.json();
      if (res.ok) {
        setRequestStatus(data.request);
      }
    } catch (err) {
      console.error('Error fetching request status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    if (requesting) return;

    setRequesting(true);
    try {
      const res = await fetch('/api/public-inclusion/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType,
          itemId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showNotification(
          data.error || 'Error al crear la solicitud',
          'error'
        );
        return;
      }

      setRequestStatus(data.request);
      showNotification(
        'Solicitud de incorporación pública creada correctamente',
        'success'
      );
    } catch (err) {
      console.error('Error creating request:', err);
      showNotification('Error de conexión', 'error');
    } finally {
      setRequesting(false);
    }
  };

  const handleCancel = async () => {
    if (!requestStatus || requestStatus.status !== 'pending') return;
    if (requesting) return;

    setRequesting(true);
    try {
      const res = await fetch(`/api/public-inclusion/request/${requestStatus.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        showNotification(
          data.error || 'Error al cancelar la solicitud',
          'error'
        );
        return;
      }

      setRequestStatus(null);
      showNotification('Solicitud cancelada correctamente', 'success');
    } catch (err) {
      console.error('Error canceling request:', err);
      showNotification('Error de conexión', 'error');
    } finally {
      setRequesting(false);
    }
  };

  // No mostrar si el item ya es público o el usuario no es el dueño
  if (isGeneral || !isOwner) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500">Cargando estado de solicitud...</div>
    );
  }

  // Sin solicitud: mostrar botón para solicitar
  if (!requestStatus) {
    return (
      <button
        onClick={handleRequest}
        disabled={requesting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {requesting ? 'Solicitando...' : 'Solicitar incorporación pública'}
      </button>
    );
  }

  // Solicitud pendiente
  if (requestStatus.status === 'pending') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-800">
            Solicitud pendiente
          </span>
          <button
            onClick={handleCancel}
            disabled={requesting}
            className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requesting ? 'Cancelando...' : 'Cancelar solicitud'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Tu solicitud está siendo revisada por un gestor
        </p>
      </div>
    );
  }

  // Solicitud aprobada (el item ya debería ser público)
  if (requestStatus.status === 'approved') {
    return (
      <div className="rounded-md bg-green-100 px-3 py-2 text-sm font-medium text-green-800">
        ✓ Aprobada - Este item ahora es público
      </div>
    );
  }

  // Solicitud rechazada
  if (requestStatus.status === 'rejected') {
    return (
      <div className="space-y-2">
        <div className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800">
          ✗ Rechazada
        </div>
        {requestStatus.notes && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm font-medium text-red-800 mb-1">Motivo del rechazo:</p>
            <p className="text-sm text-red-700">{requestStatus.notes}</p>
          </div>
        )}
        <button
          onClick={handleRequest}
          disabled={requesting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {requesting ? 'Solicitando...' : 'Solicitar nuevamente'}
        </button>
      </div>
    );
  }

  return null;
}

