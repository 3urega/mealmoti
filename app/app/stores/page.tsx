'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StoreModal from '@/components/StoreModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface Store {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
  articlesCount: number;
  createdAt: string;
}

interface StoreListResponse {
  stores: Store[];
  total: number;
  limit: number;
  offset: number;
}

const typeLabels: Record<string, string> = {
  supermarket: 'Supermercado',
  specialty: 'Tienda Especializada',
  online: 'Tienda Online',
  other: 'Otro',
};

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [generalFilter, setGeneralFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);

  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchStores();
  }, [search, generalFilter, typeFilter, offset]);

  const fetchStores = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }

      if (generalFilter !== 'all') {
        params.append('general', generalFilter === 'general' ? 'true' : 'false');
      }

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const res = await fetch(`/api/stores?${params.toString()}`);
      const data: StoreListResponse = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar comercios');
        return;
      }

      setStores(data.stores || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setOffset(0);
  };

  const handleGeneralFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setGeneralFilter(e.target.value);
    setOffset(0);
  };

  const handleTypeFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setTypeFilter(e.target.value);
    setOffset(0);
  };

  const handleCreateClick = () => {
    setEditingStore(null);
    setShowModal(true);
  };

  const handleEditClick = (store: Store) => {
    setEditingStore(store);
    setShowModal(true);
  };

  const handleDeleteClick = (store: Store) => {
    setDeletingStore(store);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStore) return;

    setDeleteError('');
    try {
      const res = await fetch(`/api/stores/${deletingStore.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Error al eliminar comercio');
        if (data.details) {
          if (data.details.articles) {
            setDeleteError(
              `${data.error}. Está asociado a ${data.details.articles} artículos.`
            );
          } else if (data.details.items) {
            setDeleteError(
              `${data.error}. Está asociado a ${data.details.items} items.`
            );
          }
        }
        return;
      }

      setShowDeleteModal(false);
      setDeletingStore(null);
      fetchStores();
    } catch (err) {
      setDeleteError('Error de conexión');
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingStore(null);
    fetchStores();
  };

  const handleClearFilters = () => {
    setSearch('');
    setGeneralFilter('all');
    setTypeFilter('all');
    setOffset(0);
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const startItem = offset + 1;
  const endItem = Math.min(offset + limit, total);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Comercios</h1>
        <button
          onClick={handleCreateClick}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nuevo Comercio
        </button>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700"
            >
              Buscar por nombre
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar comercio..."
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="generalFilter"
              className="block text-sm font-medium text-gray-700"
            >
              Filtrar por tipo
            </label>
            <select
              id="generalFilter"
              value={generalFilter}
              onChange={handleGeneralFilterChange}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="general">Generales</option>
              <option value="particular">Particulares</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="typeFilter"
              className="block text-sm font-medium text-gray-700"
            >
              Filtrar por categoría
            </label>
            <select
              id="typeFilter"
              value={typeFilter}
              onChange={handleTypeFilterChange}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="supermarket">Supermercado</option>
              <option value="specialty">Tienda Especializada</option>
              <option value="online">Tienda Online</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleClearFilters}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Cargando comercios...</div>
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">
            {search || generalFilter !== 'all' || typeFilter !== 'all'
              ? 'No se encontraron comercios con los filtros aplicados.'
              : 'No hay comercios todavía. Crea tu primer comercio para comenzar.'}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla de Comercios */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Dirección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Visibilidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Artículos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {stores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      <button
                        onClick={() => router.push(`/app/stores/${store.id}`)}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {store.name}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          store.isGeneral
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {store.isGeneral ? 'General' : 'Particular'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {typeLabels[store.type] || store.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {store.address || (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {store.isGeneral ? 'Todos' : 'Solo yo'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {store.articlesCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(store)}
                        className="mr-3 text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(store)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startItem}</span> a{' '}
                <span className="font-medium">{endItem}</span> de{' '}
                <span className="font-medium">{total}</span> comercios
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="flex items-center px-4 text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Crear/Editar */}
      <StoreModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingStore(null);
        }}
        store={editingStore}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de Confirmar Eliminación */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingStore(null);
          setDeleteError('');
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Comercio"
        message={`¿Estás seguro de que quieres eliminar el comercio "${deletingStore?.name}"?`}
        itemName={deletingStore?.name || ''}
        error={deleteError}
      />
    </div>
  );
}

