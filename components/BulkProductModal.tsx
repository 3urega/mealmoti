'use client';

import { useEffect, useState } from 'react';

interface PendingProduct {
  id: string; // ID temporal para la lista
  name: string;
  description: string;
  isGeneral: boolean;
}

interface BulkProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkProductModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkProductModalProps) {
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [currentProduct, setCurrentProduct] = useState({
    name: '',
    description: '',
    isGeneral: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setPendingProducts([]);
      setCurrentProduct({
        name: '',
        description: '',
        isGeneral: false,
      });
      setError('');
      setFieldErrors({});
      setSaving(false);
    }
  }, [isOpen]);

  const validateProduct = (product: typeof currentProduct): boolean => {
    const errors: Record<string, string> = {};

    if (!product.name.trim()) {
      errors.name = 'El nombre es requerido';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddToList = () => {
    if (!validateProduct(currentProduct)) {
      return;
    }

    const newProduct: PendingProduct = {
      id: `temp-${Date.now()}-${Math.random()}`,
      name: currentProduct.name.trim(),
      description: currentProduct.description.trim(),
      isGeneral: currentProduct.isGeneral,
    };

    setPendingProducts([...pendingProducts, newProduct]);
    setCurrentProduct({
      name: '',
      description: '',
      isGeneral: false,
    });
    setFieldErrors({});
  };

  const handleRemoveFromList = (id: string) => {
    setPendingProducts(pendingProducts.filter((p) => p.id !== id));
  };

  const handleEditInList = (id: string) => {
    const product = pendingProducts.find((p) => p.id === id);
    if (product) {
      setCurrentProduct({
        name: product.name,
        description: product.description,
        isGeneral: product.isGeneral,
      });
      handleRemoveFromList(id);
    }
  };

  const handleSaveAll = async () => {
    if (pendingProducts.length === 0) {
      setError('Debes agregar al menos un producto');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const results = await Promise.allSettled(
        pendingProducts.map((product) =>
          fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: product.name,
              description: product.description || undefined,
              isGeneral: product.isGeneral,
            }),
          })
        )
      );

      const failed = results.filter((r) => r.status === 'rejected');
      const successful = results.filter((r) => r.status === 'fulfilled');

      if (failed.length > 0) {
        setError(
          `Se crearon ${successful.length} de ${pendingProducts.length} productos. Algunos fallaron.`
        );
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError('Error de conexión al guardar productos');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Crear Múltiples Productos
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={saving}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Formulario para agregar producto */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Agregar Producto a la Lista
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="bulk-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nombre *
                </label>
                <input
                  id="bulk-name"
                  type="text"
                  required
                  value={currentProduct.name}
                  onChange={(e) => {
                    setCurrentProduct({ ...currentProduct, name: e.target.value });
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.name;
                        return newErrors;
                      });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddToList();
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
                  htmlFor="bulk-description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Descripción
                </label>
                <textarea
                  id="bulk-description"
                  value={currentProduct.description}
                  onChange={(e) =>
                    setCurrentProduct({ ...currentProduct, description: e.target.value })
                  }
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Descripción opcional..."
                />
              </div>

              <div className="flex items-center">
                <input
                  id="bulk-isGeneral"
                  type="checkbox"
                  checked={currentProduct.isGeneral}
                  onChange={(e) =>
                    setCurrentProduct({ ...currentProduct, isGeneral: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="bulk-isGeneral"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Producto general (visible para todos los usuarios)
                </label>
              </div>

              <button
                type="button"
                onClick={handleAddToList}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                ➕ Agregar a la Lista
              </button>
            </div>
          </div>

          {/* Lista de productos pendientes */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Productos Pendientes ({pendingProducts.length})
              </h3>
              {pendingProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPendingProducts([])}
                  className="text-sm text-red-600 hover:text-red-800"
                  disabled={saving}
                >
                  Limpiar Todo
                </button>
              )}
            </div>

            {pendingProducts.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No hay productos en la lista. Agrega productos usando el formulario
                  de arriba.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {product.name}
                        </span>
                        {product.isGeneral && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                            General
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditInList(product.id)}
                        className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                        disabled={saving}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromList(product.id)}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        disabled={saving}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || pendingProducts.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? `Guardando ${pendingProducts.length} productos...`
                : `Guardar ${pendingProducts.length} Producto${pendingProducts.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

