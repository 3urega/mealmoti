'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductFamilyModal from '@/components/ProductFamilyModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface ProductFamily {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductFamilyListResponse {
  families: ProductFamily[];
  total: number;
  limit: number;
  offset: number;
}

export default function ProductFamiliesPage() {
  const router = useRouter();
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [generalFilter, setGeneralFilter] = useState<string>('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);

  const [showModal, setShowModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<ProductFamily | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingFamily, setDeletingFamily] = useState<ProductFamily | null>(null);
  const [deleteError, setDeleteError] = useState('');

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
    fetchFamilies();
  }, [search, generalFilter, offset]);

  const fetchFamilies = async () => {
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

      const res = await fetch(`/api/product-families?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError((data as any).error || 'Error al cargar familias');
        return;
      }

      const response = data as ProductFamilyListResponse;
      setFamilies(response.families || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching families:', err);
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

  const handleCreateClick = () => {
    setEditingFamily(null);
    setShowModal(true);
  };

  const handleEditClick = (family: ProductFamily) => {
    setEditingFamily(family);
    setShowModal(true);
  };

  const handleDeleteClick = (family: ProductFamily) => {
    setDeletingFamily(family);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFamily) return;

    setDeleteError('');
    try {
      const res = await fetch(`/api/product-families/${deletingFamily.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Error al eliminar familia');
        if (data.details) {
          setDeleteError(
            `${data.error}. Está asociada a ${data.details.products} productos.`
          );
        }
        return;
      }

      setShowDeleteModal(false);
      setDeletingFamily(null);
      fetchFamilies();
    } catch (err) {
      setDeleteError('Error de conexión');
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingFamily(null);
    fetchFamilies();
  };

  const handleClearFilters = () => {
    setSearch('');
    setGeneralFilter('all');
    setOffset(0);
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const startItem = offset + 1;
  const endItem = Math.min(offset + limit, total);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Familias de Productos</h1>
          <p className="mt-2 text-sm text-gray-600">
            Organiza tus productos en familias como Yogur, Carne, Pescado, etc.
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nueva Familia
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
              placeholder="Buscar familia..."
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
              <option value="all">Todas</option>
              <option value="general">Generales</option>
              <option value="particular">Particulares</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Limpiar Filtros
            </button>
          </div>
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
          <div className="text-gray-600">Cargando familias...</div>
        </div>
      ) : families.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">
            {search || generalFilter !== 'all'
              ? 'No se encontraron familias con los filtros aplicados.'
              : 'No hay familias todavía. Crea tu primera familia para comenzar.'}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla de Familias */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {families.map((family) => (
                  <tr key={family.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      <Link
                        href={`/app/product-families/${family.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {family.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {family.description || (
                        <span className="text-gray-400">Sin descripción</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          family.isGeneral
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {family.isGeneral ? 'General' : 'Particular'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {family.productsCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(family)}
                        className="mr-3 text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(family)}
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
                <span className="font-medium">{total}</span> familias
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
      <ProductFamilyModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingFamily(null);
        }}
        family={editingFamily}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de Confirmar Eliminación */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingFamily(null);
          setDeleteError('');
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Familia"
        message={`¿Estás seguro de que quieres eliminar la familia "${deletingFamily?.name}"?`}
        itemName={deletingFamily?.name || ''}
        error={deleteError}
      />
    </div>
  );
}

