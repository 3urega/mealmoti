'use client';

import { useEffect, useState } from 'react';
import SearchableArticleSelect from '@/components/SearchableArticleSelect';
import SearchableProductSelect from '@/components/SearchableProductSelect';

interface Store {
  id: string;
  name: string;
  type: string;
}

interface Unit {
  id: string;
  name: string;
  symbol: string;
}

interface PendingItem {
  id: string; // ID temporal para la lista
  articleId: string;
  articleName: string;
  quantity: string;
  unitId: string;
  unitName: string;
  storeId: string;
  storeName: string;
  notes: string;
}

interface BulkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  listId: string;
  stores: Store[];
}

export default function BulkItemModal({
  isOpen,
  onClose,
  onSuccess,
  listId,
  stores,
}: BulkItemModalProps) {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    productId: '',
    articleId: '',
    articleName: '',
    quantity: '',
    unitId: '',
    storeId: '',
    notes: '',
  });
  const [exampleArticles, setExampleArticles] = useState<Array<{ id: string; name: string; description?: string | null }>>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      const data = await res.json();
      if (res.ok) {
        const loadedUnits = data.units || [];
        setUnits(loadedUnits);
        // Establecer unidad por defecto
        const defaultUnit = loadedUnits.find((u: Unit) => u.name === 'unidades');
        if (defaultUnit) {
          setCurrentItem((prev) => ({ ...prev, unitId: defaultUnit.id }));
        }
      }
    } catch (err) {
      console.error('Error al cargar unidades:', err);
    }
  };

  const fetchExampleArticles = async (productId: string) => {
    try {
      const res = await fetch(`/api/articles/search?productId=${encodeURIComponent(productId)}&limit=2`);
      if (res.ok) {
        const data = await res.json();
        setExampleArticles(data.articles || []);
      } else {
        setExampleArticles([]);
      }
    } catch (err) {
      console.error('Error al cargar artículos de ejemplo:', err);
      setExampleArticles([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUnits();
      setPendingItems([]);
      setCurrentItem({
        productId: '',
        articleId: '',
        articleName: '',
        quantity: '',
        unitId: '',
        storeId: '',
        notes: '',
      });
      setExampleArticles([]);
      setError('');
      setFieldErrors({});
      setSaving(false);
    }
  }, [isOpen]);

  // Obtener artículos de ejemplo cuando se selecciona un producto
  useEffect(() => {
    if (currentItem.productId) {
      fetchExampleArticles(currentItem.productId);
      // Limpiar la selección de artículo cuando cambia el producto
      setCurrentItem((prev) => ({
        ...prev,
        articleId: '',
        articleName: '',
      }));
    } else {
      setExampleArticles([]);
      setCurrentItem((prev) => ({
        ...prev,
        articleId: '',
        articleName: '',
      }));
    }
  }, [currentItem.productId]);

  const validateItem = (item: typeof currentItem): boolean => {
    const errors: Record<string, string> = {};

    if (!item.productId) {
      errors.productId = 'El producto es requerido';
    }
    if (!item.articleId) {
      errors.articleId = 'El artículo es requerido';
    }
    if (!item.quantity.trim()) {
      errors.quantity = 'La cantidad es requerida';
    } else if (parseFloat(item.quantity) <= 0) {
      errors.quantity = 'La cantidad debe ser mayor que 0';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddToList = () => {
    if (!validateItem(currentItem)) {
      return;
    }

    const store = stores.find((s) => s.id === currentItem.storeId);
    const selectedUnit = units.find((u) => u.id === currentItem.unitId);
    const newItem: PendingItem = {
      id: `temp-${Date.now()}-${Math.random()}`,
      articleId: currentItem.articleId,
      articleName: currentItem.articleName,
      quantity: currentItem.quantity.trim(),
      unitId: currentItem.unitId || '',
      unitName: selectedUnit?.name || 'unidades',
      storeId: currentItem.storeId,
      storeName: store?.name || '',
      notes: currentItem.notes.trim(),
    };

    setPendingItems([...pendingItems, newItem]);
    const defaultUnit = units.find((u) => u.name === 'unidades');
    setCurrentItem({
      productId: currentItem.productId, // Mantener el producto seleccionado
      articleId: '',
      articleName: '',
      quantity: '',
      unitId: defaultUnit?.id || '',
      storeId: '',
      notes: '',
    });
    setFieldErrors({});
  };

  const handleRemoveFromList = (id: string) => {
    setPendingItems(pendingItems.filter((item) => item.id !== id));
  };

  const handleEditInList = async (id: string) => {
    const item = pendingItems.find((item) => item.id === id);
    if (item) {
      // Obtener el productId del artículo
      try {
        const res = await fetch(`/api/articles/${item.articleId}`);
        const data = await res.json();
        if (res.ok && data.article && data.article.productId) {
          setCurrentItem({
            productId: data.article.productId,
            articleId: item.articleId,
            articleName: item.articleName,
            quantity: item.quantity,
            unitId: item.unitId,
            storeId: item.storeId,
            notes: item.notes,
          });
        } else {
          // Si no se puede obtener el productId, establecer valores sin él
          setCurrentItem({
            productId: '',
            articleId: item.articleId,
            articleName: item.articleName,
            quantity: item.quantity,
            unitId: item.unitId,
            storeId: item.storeId,
            notes: item.notes,
          });
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        // En caso de error, establecer valores sin productId
        setCurrentItem({
          productId: '',
          articleId: item.articleId,
          articleName: item.articleName,
          quantity: item.quantity,
          unitId: item.unitId,
          storeId: item.storeId,
          notes: item.notes,
        });
      }
      handleRemoveFromList(id);
    }
  };

  const handleSaveAll = async () => {
    if (pendingItems.length === 0) {
      setError('Debes agregar al menos un item');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const results = await Promise.allSettled(
        pendingItems.map((item) =>
          fetch(`/api/lists/${listId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              articleId: item.articleId,
              quantity: parseFloat(item.quantity),
              unitId: item.unitId || undefined,
              storeId: item.storeId || undefined,
              notes: item.notes || undefined,
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
          `Se agregaron ${successful.length - serverFailed.length} de ${pendingItems.length} items. ${totalFailed} fallaron.`
        );
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError('Error de conexión al guardar items');
    } finally {
      setSaving(false);
    }
  };

  const handleArticleSelect = (articleId: string) => {
    if (articleId) {
      // Cargar nombre del artículo
      fetch(`/api/articles/${articleId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.article) {
            const articleName = `${data.article.name}${data.article.brand ? ` - ${data.article.brand}` : ''}${data.article.variant ? ` (${data.article.variant})` : ''}`;
            setCurrentItem((prev) => ({
              ...prev,
              articleId,
              articleName,
            }));
          }
        })
        .catch(() => {
          // Si falla, solo actualizar el ID
          setCurrentItem((prev) => ({
            ...prev,
            articleId,
            articleName: '',
          }));
        });
    } else {
      setCurrentItem((prev) => ({
        ...prev,
        articleId: '',
        articleName: '',
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
              Agregar Múltiples Items
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

          {/* Formulario para agregar item */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Agregar Item a la Lista
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="bulk-item-product"
                  className="block text-sm font-medium text-gray-700"
                >
                  Producto *
                </label>
                <div className="mt-1">
                  <SearchableProductSelect
                    value={currentItem.productId}
                    onChange={(value) => {
                      setCurrentItem((prev) => ({
                        ...prev,
                        productId: value,
                      }));
                      if (fieldErrors.productId) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.productId;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Buscar producto... (mínimo 3 caracteres)"
                  />
                </div>
                {fieldErrors.productId && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.productId}
                  </p>
                )}
              </div>
              {currentItem.productId && (
                <div>
                  <label
                    htmlFor="bulk-item-article"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Artículo *
                  </label>
                  {exampleArticles.length > 0 && (
                    <div className="mb-2 rounded-md bg-gray-50 p-2 text-xs text-gray-600">
                      <span className="font-medium">Ejemplos: </span>
                      {exampleArticles.map((article, index) => (
                        <span key={article.id}>
                          {article.name}
                          {index < exampleArticles.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-1">
                    <SearchableArticleSelect
                      value={currentItem.articleId}
                      onChange={handleArticleSelect}
                      placeholder="Buscar artículo..."
                      searchEndpoint="/api/articles/search"
                      minChars={3}
                      debounceMs={1000}
                      productId={currentItem.productId}
                    />
                  </div>
                  {fieldErrors.articleId && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.articleId}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="bulk-item-store"
                  className="block text-sm font-medium text-gray-700"
                >
                  Comercio (opcional)
                </label>
                <select
                  id="bulk-item-store"
                  value={currentItem.storeId}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, storeId: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Ninguno</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bulk-item-quantity"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Cantidad *
                  </label>
                  <input
                    id="bulk-item-quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={currentItem.quantity}
                    onChange={(e) => {
                      setCurrentItem({ ...currentItem, quantity: e.target.value });
                      if (fieldErrors.quantity) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.quantity;
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
                      fieldErrors.quantity
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="2"
                  />
                  {fieldErrors.quantity && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.quantity}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="bulk-item-unit"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Unidad
                  </label>
                  <select
                    id="bulk-item-unit"
                    value={currentItem.unitId}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, unitId: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  >
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="bulk-item-notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Notas
                </label>
                <textarea
                  id="bulk-item-notes"
                  value={currentItem.notes}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, notes: e.target.value })
                  }
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Notas adicionales..."
                />
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

          {/* Lista de items pendientes */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Items Pendientes ({pendingItems.length})
              </h3>
              {pendingItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPendingItems([])}
                  className="text-sm text-red-600 hover:text-red-800"
                  disabled={saving}
                >
                  Limpiar Todo
                </button>
              )}
            </div>

            {pendingItems.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No hay items en la lista. Agrega items usando el formulario de
                  arriba.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {item.articleName}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Cantidad:</span> {item.quantity}{' '}
                        {item.unitName}
                      </div>
                      {item.storeName && (
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="font-medium">Comercio:</span>{' '}
                          {item.storeName}
                        </div>
                      )}
                      {item.notes && (
                        <div className="mt-1 text-sm text-gray-500">
                          <span className="font-medium">Notas:</span> {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditInList(item.id)}
                        className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                        disabled={saving}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromList(item.id)}
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
              disabled={saving || pendingItems.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? `Agregando ${pendingItems.length} items...`
                : `Agregar ${pendingItems.length} Item${pendingItems.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

