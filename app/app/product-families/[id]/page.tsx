'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SearchableProductSelect from '@/components/SearchableProductSelect';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { useNotification } from '@/contexts/NotificationContext';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
}

interface ProductFamily {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
  productsCount: number;
  products: Product[];
  createdAt: string;
  updatedAt: string;
}

export default function ProductFamilyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.id as string;
  const { showNotification } = useNotification();

  const [family, setFamily] = useState<ProductFamily | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchFamily();
  }, [familyId]);

  const fetchFamily = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/product-families/${familyId}`);
      const data = await res.json();
      if (res.ok) {
        setFamily(data.family);
      } else {
        setError(data.error || 'Error al cargar la familia');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching family:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProductId) {
      setAddError('Por favor selecciona un producto');
      return;
    }

    setAdding(true);
    setAddError('');

    try {
      const res = await fetch(`/api/product-families/${familyId}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProductId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error || 'Error al añadir el producto');
        return;
      }

      setSelectedProductId('');
      fetchFamily();
      showNotification('Producto añadido a la familia correctamente', 'success');
    } catch (err) {
      setAddError('Error de conexión');
      console.error('Error adding product:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveClick = (productId: string) => {
    setRemovingProductId(productId);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleRemoveConfirm = async () => {
    if (!removingProductId) return;

    setDeleteError('');
    try {
      const res = await fetch(
        `/api/product-families/${familyId}/products/${removingProductId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Error al remover el producto');
        return;
      }

      setShowDeleteModal(false);
      setRemovingProductId(null);
      fetchFamily();
      showNotification('Producto removido de la familia correctamente', 'success');
    } catch (err) {
      setDeleteError('Error de conexión');
      console.error('Error removing product:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando familia...</div>
      </div>
    );
  }

  if (error || !family) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">{error || 'Familia no encontrada'}</p>
        <Link
          href="/app/product-families"
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          ← Volver a familias
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/app/product-families"
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          ← Volver a familias
        </Link>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">{family.name}</h1>
          {family.description && (
            <p className="mt-2 text-gray-600">{family.description}</p>
          )}
          <div className="mt-2 flex items-center gap-4">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                family.isGeneral
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {family.isGeneral ? 'General' : 'Particular'}
            </span>
            <span className="text-sm text-gray-600">
              {family.productsCount} producto{family.productsCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Añadir Producto */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Añadir Producto
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-3">
            <label
              htmlFor="product-select"
              className="block text-sm font-medium text-gray-700"
            >
              Buscar producto
            </label>
            <div className="mt-1">
              <SearchableProductSelect
                value={selectedProductId}
                onChange={setSelectedProductId}
                placeholder="Buscar producto para añadir..."
                error={addError}
              />
            </div>
            {addError && (
              <p className="mt-1 text-sm text-red-600">{addError}</p>
            )}
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddProduct}
              disabled={adding || !selectedProductId}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? 'Añadiendo...' : 'Añadir'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Productos */}
      <div className="rounded-lg border border-gray-200 bg-white shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Productos</h2>
        </div>
        {family.products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">
              No hay productos en esta familia todavía.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Usa el formulario de arriba para añadir productos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {family.products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      <Link
                        href={`/app/products/${product.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {product.description || (
                        <span className="text-gray-400">Sin descripción</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          product.isGeneral
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {product.isGeneral ? 'General' : 'Particular'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveClick(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmar Eliminación */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setRemovingProductId(null);
          setDeleteError('');
        }}
        onConfirm={handleRemoveConfirm}
        title="Remover Producto"
        message="¿Estás seguro de que quieres remover este producto de la familia?"
        itemName={
          family.products.find((p) => p.id === removingProductId)?.name || ''
        }
        error={deleteError}
      />
    </div>
  );
}

