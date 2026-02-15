'use client';

import { useEffect, useState } from 'react';
import { useNotification } from '@/contexts/NotificationContext';

interface Article {
  id: string;
  name: string;
  brand: string;
  variant?: string | null;
  suggestedPrice?: number | null;
}

interface Unit {
  id: string;
  name: string;
  symbol: string;
}

interface ArticleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  listId: string;
  listArticleIds?: Set<string>;
  onSuccess: (articleId: string) => void;
}

export default function ArticleSelector({
  isOpen,
  onClose,
  productId,
  productName,
  listId,
  listArticleIds = new Set(),
  onSuccess,
}: ArticleSelectorProps) {
  const { showToast } = useNotification();
  const [articles, setArticles] = useState<Article[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [error, setError] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitId, setUnitId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchArticles();
      fetchUnits();
      // Resetear estado
      setSelectedArticleId('');
      setQuantity('1');
      setUnitId('');
      setError('');
    }
  }, [isOpen, productId]);

  // Limpiar selección si el artículo seleccionado ya está agregado
  useEffect(() => {
    if (selectedArticleId && listArticleIds.has(selectedArticleId)) {
      setSelectedArticleId('');
    }
  }, [selectedArticleId, listArticleIds]);

  const fetchArticles = async () => {
    setLoadingArticles(true);
    try {
      const res = await fetch(`/api/articles?productId=${productId}&limit=100`);
      const data = await res.json();
      if (res.ok) {
        setArticles(data.articles || []);
      } else {
        setError(data.error || 'Error al cargar artículos');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching articles:', err);
    } finally {
      setLoadingArticles(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      const data = await res.json();
      if (res.ok) {
        setUnits(data.units || []);
      }
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const handleAddToList = async () => {
    if (!selectedArticleId) {
      setError('Por favor selecciona un artículo');
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError('La cantidad debe ser un número positivo');
      return;
    }

    setAdding(true);
    setError('');

    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: selectedArticleId,
          quantity: quantityNum,
          unitId: unitId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al agregar artículo a la lista');
        return;
      }

      showToast('success', 'Artículo agregado a la lista correctamente');
      onSuccess(selectedArticleId);
      onClose();
    } catch (err) {
      setError('Error de conexión');
      console.error('Error adding article:', err);
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Seleccionar Artículo
            </h2>
            <p className="mt-1 text-sm text-gray-600">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {loadingArticles ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Cargando artículos...</div>
            </div>
          ) : articles.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
              <p className="text-gray-600">
                No hay artículos disponibles para este producto.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => {
                const isAlreadyAdded = listArticleIds.has(article.id);
                return (
                  <button
                    key={article.id}
                    onClick={() => {
                      if (!isAlreadyAdded) {
                        setSelectedArticleId(article.id);
                      }
                    }}
                    disabled={isAlreadyAdded}
                    className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                      isAlreadyAdded
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                        : selectedArticleId === article.id
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {article.name}
                          </h3>
                          {isAlreadyAdded && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                              Ya agregado
                            </span>
                          )}
                          {!isAlreadyAdded && selectedArticleId === article.id && (
                            <svg
                              className="h-5 w-5 text-green-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                          <span>{article.brand}</span>
                          {article.variant && (
                            <>
                              <span>•</span>
                              <span>{article.variant}</span>
                            </>
                          )}
                          {article.suggestedPrice && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-gray-900">
                                €{article.suggestedPrice.toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulario de cantidad y unidad */}
        {selectedArticleId && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="quantity"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cantidad
                </label>
                <input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  placeholder="1"
                />
              </div>
              <div>
                <label
                  htmlFor="unit"
                  className="block text-sm font-medium text-gray-700"
                >
                  Unidad (opcional)
                </label>
                <select
                  id="unit"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                >
                  <option value="">Sin unidad</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Footer con botones */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            disabled={adding}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleAddToList}
            disabled={adding || !selectedArticleId || listArticleIds.has(selectedArticleId)}
            className="flex items-center gap-2 rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Agregando...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Agregar a Lista
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

