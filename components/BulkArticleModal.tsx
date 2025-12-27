'use client';

import { useEffect, useState, useRef } from 'react';
import SearchableProductSelect from '@/components/SearchableProductSelect';

interface PendingArticle {
  id: string; // ID temporal para la lista
  name: string;
  productId: string;
  productName: string;
  brand: string;
  variant: string;
  suggestedPrice: string;
  isGeneral: boolean;
}

interface BulkArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkArticleModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkArticleModalProps) {
  const [pendingArticles, setPendingArticles] = useState<PendingArticle[]>([]);
  const [currentArticle, setCurrentArticle] = useState({
    name: '',
    productId: '',
    productName: '',
    brand: 'genérico',
    variant: '',
    suggestedPrice: '',
    isGeneral: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setPendingArticles([]);
      setCurrentArticle({
        name: '',
        productId: '',
        productName: '',
        brand: 'genérico',
        variant: '',
        suggestedPrice: '',
        isGeneral: false,
      });
      setError('');
      setFieldErrors({});
      setSaving(false);
    }
  }, [isOpen]);

  const validateArticle = (article: typeof currentArticle): boolean => {
    const errors: Record<string, string> = {};

    if (!article.name.trim()) {
      errors.name = 'El nombre es requerido';
    }
    if (!article.productId) {
      errors.productId = 'El producto es requerido';
    }
    if (!article.brand.trim()) {
      errors.brand = 'La marca es requerida';
    }
    if (
      article.suggestedPrice &&
      parseFloat(article.suggestedPrice) <= 0
    ) {
      errors.suggestedPrice = 'El precio debe ser positivo';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddToList = () => {
    if (!validateArticle(currentArticle)) {
      return;
    }

    const newArticle: PendingArticle = {
      id: `temp-${Date.now()}-${Math.random()}`,
      name: currentArticle.name.trim(),
      productId: currentArticle.productId,
      productName: currentArticle.productName,
      brand: currentArticle.brand.trim() || 'genérico',
      variant: currentArticle.variant.trim(),
      suggestedPrice: currentArticle.suggestedPrice.trim(),
      isGeneral: currentArticle.isGeneral,
    };

    setPendingArticles([...pendingArticles, newArticle]);
    setCurrentArticle({
      name: '',
      productId: '',
      productName: '',
      brand: 'genérico',
      variant: '',
      suggestedPrice: '',
      isGeneral: false,
    });
    setFieldErrors({});
  };

  const handleRemoveFromList = (id: string) => {
    setPendingArticles(pendingArticles.filter((a) => a.id !== id));
  };

  const handleEditInList = (id: string) => {
    const article = pendingArticles.find((a) => a.id === id);
    if (article) {
      setCurrentArticle({
        name: article.name,
        productId: article.productId,
        productName: article.productName,
        brand: article.brand,
        variant: article.variant,
        suggestedPrice: article.suggestedPrice,
        isGeneral: article.isGeneral,
      });
      handleRemoveFromList(id);
    }
  };

  const handleSaveAll = async () => {
    if (pendingArticles.length === 0) {
      setError('Debes agregar al menos un artículo');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const results = await Promise.allSettled(
        pendingArticles.map((article) =>
          fetch('/api/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: article.name,
              productId: article.productId,
              brand: article.brand,
              variant: article.variant || undefined,
              suggestedPrice: article.suggestedPrice
                ? parseFloat(article.suggestedPrice)
                : undefined,
              isGeneral: article.isGeneral,
            }),
          })
        )
      );

      const failed = results.filter((r) => r.status === 'rejected');
      const successful = results.filter((r) => r.status === 'fulfilled');

      // Verificar si algunos fueron rechazados por el servidor
      const serverFailed = results.filter(
        (r) =>
          r.status === 'fulfilled' &&
          !(r as PromiseFulfilledResult<Response>).value.ok
      );

      if (failed.length > 0 || serverFailed.length > 0) {
        const totalFailed = failed.length + serverFailed.length;
        setError(
          `Se crearon ${successful.length - serverFailed.length} de ${pendingArticles.length} artículos. ${totalFailed} fallaron.`
        );
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError('Error de conexión al guardar artículos');
    } finally {
      setSaving(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    if (productId) {
      // Cargar nombre del producto
      fetch(`/api/products/${productId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.product) {
            setCurrentArticle((prev) => ({
              ...prev,
              productId,
              productName: data.product.name,
            }));
          }
        })
        .catch(() => {
          // Si falla, solo actualizar el ID
          setCurrentArticle((prev) => ({
            ...prev,
            productId,
            productName: '',
          }));
        });
    } else {
      setCurrentArticle((prev) => ({
        ...prev,
        productId: '',
        productName: '',
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Crear Múltiples Artículos
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

          {/* Formulario para agregar artículo */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Agregar Artículo a la Lista
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="bulk-article-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nombre *
                </label>
                <input
                  id="bulk-article-name"
                  type="text"
                  required
                  value={currentArticle.name}
                  onChange={(e) => {
                    setCurrentArticle({ ...currentArticle, name: e.target.value });
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
                  placeholder="Ej: Tortillas de maíz Hacendado"
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="bulk-article-product"
                  className="block text-sm font-medium text-gray-700"
                >
                  Producto *
                </label>
                <div className="mt-1">
                  <SearchableProductSelect
                    value={currentArticle.productId}
                    onChange={handleProductSelect}
                    placeholder="Buscar producto... (mínimo 3 caracteres)"
                    error={fieldErrors.productId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bulk-article-brand"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Marca *
                  </label>
                  <input
                    id="bulk-article-brand"
                    type="text"
                    required
                    value={currentArticle.brand}
                    onChange={(e) => {
                      setCurrentArticle({ ...currentArticle, brand: e.target.value });
                      if (fieldErrors.brand) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.brand;
                          return newErrors;
                        });
                      }
                    }}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 ${
                      fieldErrors.brand
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="Ej: Hacendado"
                  />
                  {fieldErrors.brand && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.brand}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="bulk-article-variant"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Variante
                  </label>
                  <input
                    id="bulk-article-variant"
                    type="text"
                    value={currentArticle.variant}
                    onChange={(e) =>
                      setCurrentArticle({ ...currentArticle, variant: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Ej: de maíz, 5L"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="bulk-article-price"
                  className="block text-sm font-medium text-gray-700"
                >
                  Precio Sugerido (€)
                </label>
                <input
                  id="bulk-article-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentArticle.suggestedPrice}
                  onChange={(e) => {
                    setCurrentArticle({ ...currentArticle, suggestedPrice: e.target.value });
                    if (fieldErrors.suggestedPrice) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.suggestedPrice;
                        return newErrors;
                      });
                    }
                  }}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 ${
                    fieldErrors.suggestedPrice
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="1.50"
                />
                {fieldErrors.suggestedPrice && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.suggestedPrice}
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="bulk-article-isGeneral"
                  type="checkbox"
                  checked={currentArticle.isGeneral}
                  onChange={(e) =>
                    setCurrentArticle({ ...currentArticle, isGeneral: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="bulk-article-isGeneral"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Artículo general (visible para todos los usuarios)
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

          {/* Lista de artículos pendientes */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Artículos Pendientes ({pendingArticles.length})
              </h3>
              {pendingArticles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPendingArticles([])}
                  className="text-sm text-red-600 hover:text-red-800"
                  disabled={saving}
                >
                  Limpiar Todo
                </button>
              )}
            </div>

            {pendingArticles.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No hay artículos en la lista. Agrega artículos usando el formulario
                  de arriba.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingArticles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {article.name}
                        </span>
                        {article.isGeneral && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                            General
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Producto:</span> {article.productName}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Marca:</span> {article.brand}
                        {article.variant && (
                          <span className="text-gray-500"> - {article.variant}</span>
                        )}
                      </div>
                      {article.suggestedPrice && (
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="font-medium">Precio:</span>{' '}
                          {parseFloat(article.suggestedPrice).toFixed(2)} €
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditInList(article.id)}
                        className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                        disabled={saving}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromList(article.id)}
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
              disabled={saving || pendingArticles.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? `Guardando ${pendingArticles.length} artículos...`
                : `Guardar ${pendingArticles.length} Artículo${pendingArticles.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

