'use client';

import { useEffect, useState } from 'react';
import IngredientModal from '@/components/IngredientModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface Ingredient {
  id: string;
  name: string;
  type: 'chemical' | 'generic' | 'product';
  description?: string | null;
  allergenInfo?: string | null;
  productId?: string | null;
  product?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface IngredientListResponse {
  ingredients: Ingredient[];
  total: number;
  limit: number;
  offset: number;
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchIngredients();
  }, [search, typeFilter, offset]);

  const fetchIngredients = async () => {
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

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const res = await fetch(`/api/ingredients?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError((data as any).error || 'Error al cargar ingredientes');
        return;
      }

      const response = data as IngredientListResponse;
      setIngredients(response.ingredients || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching ingredients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setOffset(0); // Reset a primera página al buscar
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
    setOffset(0); // Reset a primera página al filtrar
  };

  const handleCreateClick = () => {
    setEditingIngredient(null);
    setShowModal(true);
  };

  const handleEditClick = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setShowModal(true);
  };

  const handleDeleteClick = (ingredient: Ingredient) => {
    setDeletingIngredient(ingredient);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingIngredient) return;

    setDeleteError('');
    try {
      const res = await fetch(`/api/ingredients/${deletingIngredient.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Error al eliminar ingrediente');
        if (data.details) {
          setDeleteError(
            `${data.error}. Está asociado a ${data.details.products} productos y ${data.details.articles} artículos.`
          );
        }
        return;
      }

      setShowDeleteModal(false);
      setDeletingIngredient(null);
      fetchIngredients();
    } catch (err) {
      setDeleteError('Error de conexión');
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingIngredient(null);
    fetchIngredients();
  };

  const handleClearFilters = () => {
    setSearch('');
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
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Ingredientes</h1>
        <button
          onClick={handleCreateClick}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nuevo Ingrediente
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
              placeholder="Buscar ingrediente..."
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="typeFilter"
              className="block text-sm font-medium text-gray-700"
            >
              Filtrar por tipo
            </label>
            <select
              id="typeFilter"
              value={typeFilter}
              onChange={handleTypeFilterChange}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="chemical">Chemical</option>
              <option value="generic">Generic</option>
              <option value="product">Product</option>
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
          <div className="text-gray-600">Cargando ingredientes...</div>
        </div>
      ) : ingredients.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">
            {search || typeFilter !== 'all'
              ? 'No se encontraron ingredientes con los filtros aplicados.'
              : 'No hay ingredientes todavía. Crea tu primer ingrediente para comenzar.'}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla de Ingredientes */}
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
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Producto Asociado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {ingredients.map((ingredient) => (
                  <tr key={ingredient.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {ingredient.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        {ingredient.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {ingredient.description || (
                        <span className="text-gray-400">Sin descripción</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {ingredient.product ? (
                        <span className="text-gray-900">{ingredient.product.name}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(ingredient)}
                        className="mr-3 text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(ingredient)}
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
                <span className="font-medium">{total}</span> ingredientes
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
      <IngredientModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingIngredient(null);
        }}
        ingredient={editingIngredient}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de Confirmar Eliminación */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingIngredient(null);
          setDeleteError('');
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Ingrediente"
        message={`¿Estás seguro de que quieres eliminar el ingrediente "${deletingIngredient?.name}"?`}
        itemName={deletingIngredient?.name || ''}
        error={deleteError}
      />
    </div>
  );
}

