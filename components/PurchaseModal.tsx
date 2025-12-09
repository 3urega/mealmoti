'use client';

import { useState, useEffect } from 'react';

interface PurchaseItem {
  id: string;
  article: {
    id: string;
    name: string;
    brand: string;
    product: {
      id: string;
      name: string;
    };
  };
  quantity: number;
  purchasedQuantity: number;
  unit?: {
    id: string;
    symbol: string;
  } | null;
  price: number;
  subtotal: number;
  store?: {
    id: string;
    name: string;
  } | null;
  notes?: string | null;
}

interface Purchase {
  id: string;
  totalPaid?: number | null;
  purchasedAt: string;
  notes?: string | null;
  items: PurchaseItem[];
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  checkedItems?: Array<{
    id: string;
    article: {
      id: string;
      name: string;
      brand: string;
      product: {
        id: string;
        name: string;
      };
    };
    quantity: number;
    purchasedQuantity?: number | null;
    price?: number | null;
    unit?: {
      id: string;
      symbol: string;
    } | null;
    store?: {
      id: string;
      name: string;
    } | null;
    notes?: string | null;
  }>;
  purchase?: Purchase;
  onSave: (data: {
    purchasedAt: string;
    notes?: string;
    items?: Array<{
      id: string;
      purchasedQuantity?: number;
      price?: number;
      notes?: string | null;
    }>;
  }) => Promise<void>;
}

export default function PurchaseModal({
  isOpen,
  onClose,
  mode,
  checkedItems = [],
  purchase,
  onSave,
}: PurchaseModalProps) {
  const [purchasedAt, setPurchasedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [editingItems, setEditingItems] = useState<
    Record<string, { purchasedQuantity: string; price: string; notes: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'create' && checkedItems.length > 0) {
        // Preparar items desde checkedItems
        const formattedItems: PurchaseItem[] = checkedItems.map((item) => ({
          id: `temp-${item.id}`,
          article: item.article,
          quantity: item.quantity,
          purchasedQuantity: item.purchasedQuantity || item.quantity,
          unit: item.unit,
          price: item.price || 0,
          subtotal: (item.purchasedQuantity || item.quantity) * (item.price || 0),
          store: item.store,
          notes: item.notes,
        }));
        setItems(formattedItems);
        setPurchasedAt(new Date().toISOString().split('T')[0]);
        setNotes('');

        // Inicializar editingItems
        const editing: Record<string, { purchasedQuantity: string; price: string; notes: string }> = {};
        formattedItems.forEach((item) => {
          editing[item.id] = {
            purchasedQuantity: item.purchasedQuantity.toString(),
            price: item.price.toString(),
            notes: item.notes || '',
          };
        });
        setEditingItems(editing);
      } else if (mode === 'edit' && purchase) {
        setItems(purchase.items);
        setPurchasedAt(new Date(purchase.purchasedAt).toISOString().split('T')[0]);
        setNotes(purchase.notes || '');

        // Inicializar editingItems
        const editing: Record<string, { purchasedQuantity: string; price: string; notes: string }> = {};
        purchase.items.forEach((item) => {
          editing[item.id] = {
            purchasedQuantity: item.purchasedQuantity.toString(),
            price: item.price.toString(),
            notes: item.notes || '',
          };
        });
        setEditingItems(editing);
      }
    }
  }, [isOpen, mode, checkedItems, purchase]);

  const calculateSubtotal = (itemId: string): number => {
    const editing = editingItems[itemId];
    if (!editing) return 0;
    const qty = parseFloat(editing.purchasedQuantity) || 0;
    const price = parseFloat(editing.price) || 0;
    return qty * price;
  };

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => {
      if (mode === 'edit') {
        const editing = editingItems[item.id];
        const price = parseFloat(editing?.price || '0') || 0;
        // Solo sumar si el precio es mayor que 0
        return price > 0 ? sum + calculateSubtotal(item.id) : sum;
      }
      // Solo sumar si el precio es mayor que 0
      return item.price > 0 ? sum + item.subtotal : sum;
    }, 0);
  };

  const handleItemChange = (
    itemId: string,
    field: 'purchasedQuantity' | 'price' | 'notes',
    value: string
  ) => {
    setEditingItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));

    // Actualizar subtotal en tiempo real para modo edición
    if (mode === 'edit' && (field === 'purchasedQuantity' || field === 'price')) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, subtotal: calculateSubtotal(itemId) }
            : item
        )
      );
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      if (mode === 'create') {
        await onSave({
          purchasedAt: new Date(purchasedAt).toISOString(),
          notes: notes || undefined,
        });
      } else {
        // Modo edición: enviar items actualizados
        const itemsToUpdate = items.map((item) => {
          const editing = editingItems[item.id];
          return {
            id: item.id,
            purchasedQuantity: parseFloat(editing.purchasedQuantity) || item.purchasedQuantity,
            price: parseFloat(editing.price) || item.price,
            notes: editing.notes || null,
          };
        });

        await onSave({
          purchasedAt: new Date(purchasedAt).toISOString(),
          notes: notes || undefined,
          items: itemsToUpdate,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la compra');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const total = calculateTotal();
  const itemsWithPrice = items.filter((item) => {
    if (mode === 'edit') {
      const editing = editingItems[item.id];
      return editing && parseFloat(editing.price) > 0;
    }
    return item.price > 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-lg bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' ? 'Registrar Nueva Compra' : 'Editar Compra'}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {mode === 'create'
                ? `Revisa los ${items.length} artículos que se registrarán`
                : 'Edita los detalles de la compra'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Campos de fecha y notas */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de compra *
              </label>
              <input
                type="date"
                required
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Compra semanal, supermercado..."
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lista de items */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Artículos ({items.length})
            </h3>
            {items.map((item) => {
              const editing = editingItems[item.id] || {
                purchasedQuantity: item.purchasedQuantity.toString(),
                price: item.price.toString(),
                notes: item.notes || '',
              };
              const subtotal = mode === 'edit' ? calculateSubtotal(item.id) : item.subtotal;

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.article.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {item.article.brand}
                        {item.store && ` • ${item.store.name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        €{subtotal.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">Subtotal</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cantidad comprada
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editing.purchasedQuantity}
                          onChange={(e) =>
                            handleItemChange(item.id, 'purchasedQuantity', e.target.value)
                          }
                          className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">
                          {item.unit?.symbol || 'un'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Precio unitario (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editing.price}
                        onChange={(e) =>
                          handleItemChange(item.id, 'price', e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {mode === 'edit' && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Notas
                      </label>
                      <input
                        type="text"
                        value={editing.notes}
                        onChange={(e) =>
                          handleItemChange(item.id, 'notes', e.target.value)
                        }
                        placeholder="Notas opcionales..."
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumen total */}
          <div className="rounded-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Total pagado
                </p>
                {itemsWithPrice.length < items.length && (
                  <p className="text-xs text-amber-600 mt-2 font-medium">
                    ⚠️ {items.length - itemsWithPrice.length} artículo(s) sin precio
                  </p>
                )}
                {itemsWithPrice.length === items.length && items.length > 0 && (
                  <p className="text-xs text-green-700 mt-2 font-medium">
                    ✅ Todos los artículos tienen precio
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-green-600">
                  {total > 0 ? `€${total.toFixed(2)}` : '€0.00'}
                </p>
                {mode === 'edit' && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Se actualizará al guardar
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !purchasedAt}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span>
                Guardando...
              </>
            ) : (
              <>
                💳 {mode === 'create' ? 'Registrar Compra' : 'Guardar Cambios'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

