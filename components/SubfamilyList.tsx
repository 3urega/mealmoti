'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Subfamily {
  id: string;
  name: string;
  description?: string | null;
  productsCount: number;
  varietiesCount: number;
  createdAt: string;
}

interface SubfamilyListProps {
  familyId: string;
  onRefresh?: () => void;
}

export default function SubfamilyList({
  familyId,
  onRefresh,
}: SubfamilyListProps) {
  const [subfamilies, setSubfamilies] = useState<Subfamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSubfamily, setEditingSubfamily] = useState<Subfamily | null>(
    null
  );

  const fetchSubfamilies = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/product-families/${familyId}/subfamilies`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar subfamilias');
        return;
      }

      setSubfamilies(data.subfamilies || []);
      setError('');
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubfamilies();
  }, [familyId]);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar esta subfamilia? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/product-subfamilies/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Error al eliminar la subfamilia');
        return;
      }

      fetchSubfamilies();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleSuccess = () => {
    fetchSubfamilies();
    if (onRefresh) onRefresh();
    setShowModal(false);
    setEditingSubfamily(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-gray-500">Cargando subfamilias...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Subfamilias</h3>
        <button
          onClick={() => {
            setEditingSubfamily(null);
            setShowModal(true);
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nueva Subfamilia
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {subfamilies.length === 0 ? (
        <p className="py-4 text-gray-500">No hay subfamilias aún.</p>
      ) : (
        <div className="space-y-2">
          {subfamilies.map((subfamily) => (
            <div
              key={subfamily.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/app/product-subfamilies/${subfamily.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600"
                  >
                    {subfamily.name}
                  </Link>
                </div>
                {subfamily.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {subfamily.description}
                  </p>
                )}
                <div className="mt-2 flex space-x-4 text-xs text-gray-500">
                  <span>{subfamily.productsCount} productos</span>
                  <span>{subfamily.varietiesCount} variedades</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingSubfamily(subfamily);
                    setShowModal(true);
                  }}
                  className="rounded-md px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(subfamily.id)}
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
        <SubfamilyModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingSubfamily(null);
          }}
          familyId={familyId}
          subfamily={editingSubfamily}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

// Importar el modal dinámicamente para evitar problemas de importación circular
import SubfamilyModal from './SubfamilyModal';

