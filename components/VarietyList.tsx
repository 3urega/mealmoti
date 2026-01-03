'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Variety {
  id: string;
  name: string;
  productsCount: number;
  createdAt: string;
}

interface VarietyListProps {
  subfamilyId: string;
  onRefresh?: () => void;
}

export default function VarietyList({
  subfamilyId,
  onRefresh,
}: VarietyListProps) {
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVariety, setEditingVariety] = useState<Variety | null>(null);

  const fetchVarieties = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/product-subfamilies/${subfamilyId}/varieties`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar variedades');
        return;
      }

      setVarieties(data.varieties || []);
      setError('');
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVarieties();
  }, [subfamilyId]);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar esta variedad? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/product-varieties/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Error al eliminar la variedad');
        return;
      }

      fetchVarieties();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleSuccess = () => {
    fetchVarieties();
    if (onRefresh) onRefresh();
    setShowModal(false);
    setEditingVariety(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-gray-500">Cargando variedades...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Variedades</h3>
        <button
          onClick={() => {
            setEditingVariety(null);
            setShowModal(true);
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nueva Variedad
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {varieties.length === 0 ? (
        <p className="py-4 text-gray-500">No hay variedades aún.</p>
      ) : (
        <div className="space-y-2">
          {varieties.map((variety) => (
            <div
              key={variety.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4"
            >
              <div className="flex-1">
                <Link
                  href={`/app/product-varieties/${variety.id}`}
                  className="font-medium text-gray-900 hover:text-blue-600"
                >
                  {variety.name}
                </Link>
                <div className="mt-2 text-xs text-gray-500">
                  <span>{variety.productsCount} productos</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingVariety(variety);
                    setShowModal(true);
                  }}
                  className="rounded-md px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(variety.id)}
                  className="rounded-md px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <VarietyModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingVariety(null);
          }}
          subfamilyId={subfamilyId}
          variety={editingVariety}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

// Importar el modal dinámicamente
import VarietyModal from './VarietyModal';

