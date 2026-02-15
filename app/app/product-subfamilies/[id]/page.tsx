'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import VarietyList from '@/components/VarietyList';
import SearchableProductSelect from '@/components/SearchableProductSelect';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { useNotification } from '@/contexts/NotificationContext';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
}

interface ProductSubfamily {
  id: string;
  name: string;
  description?: string | null;
  familyId: string;
  family: {
    id: string;
    name: string;
    isGeneral: boolean;
  };
  productsCount: number;
  varietiesCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProductSubfamilyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subfamilyId = params.id as string;
  const { showToast } = useNotification();

  const [subfamily, setSubfamily] = useState<ProductSubfamily | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);

  useEffect(() => {
    fetchSubfamily();
    fetchProducts();
  }, [subfamilyId]);

  const fetchSubfamily = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/product-subfamilies/${subfamilyId}`);
      const data = await res.json();
      if (res.ok) {
        setSubfamily(data.subfamily);
      } else {
        setError(data.error || 'Error al cargar la subfamilia');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching subfamily:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/product-subfamilies/${subfamilyId}/products`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
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
      const res = await fetch(`/api/products/${selectedProductId}/subfamilies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subfamilyId: subfamilyId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error || 'Error al añadir el producto');
        return;
      }

      setSelectedProductId('');
      fetchProducts();
      fetchSubfamily();
      showToast('success', 'Producto añadido a la subfamilia correctamente');
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
        `/api/products/${removingProductId}/subfamilies?subfamilyId=${subfamilyId}`,
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
      fetchProducts();
      fetchSubfamily();
      showToast('success', 'Producto removido de la subfamilia correctamente');
    } catch (err) {
      setDeleteError('Error de conexión');
      console.error('Error removing product:', err);
    }
  };

  const handleCreateProductSuccess = async (productId: string) => {
    setCreatingProduct(true);
    try {
      // Asignar el producto recién creado a la subfamilia
      const res = await fetch(`/api/products/${productId}/subfamilies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subfamilyId: subfamilyId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Error al asignar el producto a la subfamilia');
        return;
      }

      setShowCreateModal(false);
      fetchProducts();
      fetchSubfamily();
      showToast('success', 'Producto creado y asignado a la subfamilia correctamente');
    } catch (err) {
      showToast('error', 'Error de conexión al asignar producto');
      console.error('Error assigning product:', err);
    } finally {
      setCreatingProduct(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando subfamilia...</div>
      </div>
    );
  }

  if (error || !subfamily) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">{error || 'Subfamilia no encontrada'}</p>
        <Link
          href={`/app/product-families/${subfamily?.familyId || ''}`}
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          ← Volver a familia
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
          <Link
            href="/app/product-families"
            className="hover:text-gray-900"
          >
            Familias
          </Link>
          <span>/</span>
          <Link
            href={`/app/product-families/${subfamily.familyId}`}
            className="hover:text-gray-900"
          >
            {subfamily.family.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{subfamily.name}</span>
        </div>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">{subfamily.name}</h1>
          {subfamily.description && (
            <p className="mt-2 text-gray-600">{subfamily.description}</p>
          )}
          <div className="mt-2 flex items-center gap-4">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                subfamily.family.isGeneral
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {subfamily.family.isGeneral ? 'General' : 'Particular'}
            </span>
            <span className="text-sm text-gray-600">
              {subfamily.productsCount} producto{subfamily.productsCount !== 1 ? 's' : ''}
            </span>
            <span className="text-sm text-gray-600">
              {subfamily.varietiesCount} variedad{subfamily.varietiesCount !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Variedades */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <VarietyList subfamilyId={subfamilyId} onRefresh={fetchSubfamily} />
      </div>

      {/* Añadir Producto */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Añadir Producto
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + Crear Nuevo Producto
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-3">
            <label
              htmlFor="product-select"
              className="block text-sm font-medium text-gray-700"
            >
              Buscar producto existente
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
        {products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">
              No hay productos en esta subfamilia todavía.
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
                {products.map((product) => (
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
        message="¿Estás seguro de que quieres remover este producto de la subfamilia?"
        itemName={
          products.find((p) => p.id === removingProductId)?.name || ''
        }
        error={deleteError}
      />

      {/* Modal de Crear Producto */}
      {subfamily && (
        <CreateProductModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateProductSuccess}
          subfamilyId={subfamilyId}
          familyIsGeneral={subfamily.family.isGeneral}
        />
      )}
    </div>
  );
}

// Componente modal para crear producto y asignarlo automáticamente
function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
  subfamilyId,
  familyIsGeneral,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (productId: string) => void;
  subfamilyId: string;
  familyIsGeneral: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setError('');
      setFieldErrors({});
      setSaving(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setFieldErrors({ name: 'El nombre es requerido' });
      return;
    }

    setSaving(true);

    try {
      // Crear producto (heredará isGeneral de la familia)
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          isGeneral: familyIsGeneral,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          const zodErrors: Record<string, string> = {};
          data.details.forEach((err: any) => {
            if (err.path) {
              zodErrors[err.path[0]] = err.message;
            }
          });
          setFieldErrors(zodErrors);
        } else {
          setError(data.error || 'Error al crear producto');
        }
        setSaving(false);
        return;
      }

      // Llamar a onSuccess con el ID del producto creado
      onSuccess(data.product.id);
      setSaving(false);
    } catch (err) {
      setError('Error de conexión');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Crear Nuevo Producto
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Nombre *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.name;
                    return newErrors;
                  });
                }
              }}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 ${
                fieldErrors.name
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Ej: Tortillas, Pan, Leche"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Descripción opcional del producto..."
            />
          </div>

          <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-800">
              El producto se asignará automáticamente a esta subfamilia (y su familia) al crearlo.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear y Asignar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

