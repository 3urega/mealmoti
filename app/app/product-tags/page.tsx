'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Tag {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
  productsCount: number;
  createdAt: string;
}

export default function ProductTagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [search, setSearch] = useState('');
  const [filterGeneral, setFilterGeneral] = useState<string>('all');

  // Verificar permisos al cargar la página
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.user) {
          const userRole = data.user.role;
          if (userRole !== 'productos' && userRole !== 'admin' && userRole !== 'superadmin') {
            router.push('/app/dashboard');
            return;
          }
        }
      } catch (err) {
        console.error('Error checking permissions:', err);
      }
    };
    checkPermissions();
  }, [router]);

  useEffect(() => {
    fetchTags();
  }, [search, filterGeneral]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterGeneral !== 'all') params.append('general', filterGeneral);
      const res = await fetch(`/api/product-tags?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTags(data.tags || []);
      } else {
        setError(data.error || 'Error al cargar tags');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar este tag? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/product-tags/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Error al eliminar el tag');
        return;
      }

      fetchTags();
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleSuccess = () => {
    fetchTags();
    setShowModal(false);
    setEditingTag(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tags de Productos</h1>
        <p className="mt-2 text-gray-600">
          Gestiona los tags que se pueden asignar a los productos
        </p>
      </div>

      {/* Filtros y búsqueda */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tags..."
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
          <select
            value={filterGeneral}
            onChange={(e) => setFilterGeneral(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="true">Generales</option>
            <option value="false">Particulares</option>
          </select>
        </div>
        <button
          onClick={() => {
            setEditingTag(null);
            setShowModal(true);
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nuevo Tag
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <p className="text-gray-500">Cargando tags...</p>
        </div>
      ) : tags.length === 0 ? (
        <p className="py-4 text-gray-500">No hay tags aún.</p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{tag.name}</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      tag.isGeneral
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {tag.isGeneral ? 'General' : 'Particular'}
                  </span>
                </div>
                {tag.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {tag.description}
                  </p>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  <span>{tag.productsCount} productos</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingTag(tag);
                    setShowModal(true);
                  }}
                  className="rounded-md px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
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
        <TagModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingTag(null);
          }}
          tag={editingTag}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

// Importar el modal
import TagModal from '@/components/TagModal';

