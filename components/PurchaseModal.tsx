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

interface Store {
  id: string;
  name: string;
  type: string;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  stores?: Store[];
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
      storeId?: string | null;
    }>;
  }) => Promise<void>;
}

export default function PurchaseModal({
  isOpen,
  onClose,
  mode,
  stores = [],
  checkedItems = [],
  purchase,
  onSave,
}: PurchaseModalProps) {
  const [purchasedAt, setPurchasedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [inputMode, setInputMode] = useState<'total' | 'unit'>('total'); // Modo por defecto: precio total
  const [editingItems, setEditingItems] = useState<
    Record<string, { 
      purchasedQuantity: string; 
      totalPaid?: string; // Precio pagado (total) - modo 'total'
      unitPrice?: string; // Precio unitario - modo 'unit'
      price: string; // Mantener para compatibilidad, siempre será precio unitario calculado
      notes: string; 
      storeId: string;
    }>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Limpiar estado cuando se cierra el modal
      setItems([]);
      setEditingItems({});
      setPurchasedAt('');
      setNotes('');
      setInputMode('total'); // Resetear al modo por defecto
      return;
    }

    if (mode === 'create' && checkedItems && checkedItems.length > 0) {
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

      // Inicializar editingItems según el modo activo
      const editing: Record<string, { 
        purchasedQuantity: string; 
        totalPaid?: string;
        unitPrice?: string;
        price: string;
        notes: string; 
        storeId: string;
      }> = {};
      formattedItems.forEach((item) => {
        const qty = item.purchasedQuantity;
        const unitPrice = item.price || 0;
        const totalPaid = qty * unitPrice;
        
        editing[item.id] = {
          purchasedQuantity: qty.toString(),
          price: unitPrice.toString(), // Siempre mantener precio unitario calculado
          notes: item.notes || '',
          storeId: item.store?.id || '',
        };
        
        // Inicializar según el modo activo
        if (inputMode === 'total') {
          editing[item.id].totalPaid = totalPaid.toString();
        } else {
          editing[item.id].unitPrice = unitPrice.toString();
        }
      });
      setEditingItems(editing);
    } else if (mode === 'edit' && purchase) {
      setItems(purchase.items);
      setPurchasedAt(new Date(purchase.purchasedAt).toISOString().split('T')[0]);
      setNotes(purchase.notes || '');

      // Inicializar editingItems según el modo activo
      const editing: Record<string, { 
        purchasedQuantity: string; 
        totalPaid?: string;
        unitPrice?: string;
        price: string;
        notes: string; 
        storeId: string;
      }> = {};
      purchase.items.forEach((item) => {
        const qty = item.purchasedQuantity;
        const unitPrice = item.price || 0;
        const totalPaid = qty * unitPrice;
        
        editing[item.id] = {
          purchasedQuantity: qty.toString(),
          price: unitPrice.toString(), // Siempre mantener precio unitario calculado
          notes: item.notes || '',
          storeId: item.store?.id || '',
        };
        
        // Inicializar según el modo activo
        if (inputMode === 'total') {
          editing[item.id].totalPaid = totalPaid.toString();
        } else {
          editing[item.id].unitPrice = unitPrice.toString();
        }
      });
      setEditingItems(editing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, inputMode]); // Incluir inputMode para recalcular cuando cambie

  // Calcular precio unitario desde precio total
  const calculateUnitPrice = (totalPaid: number, quantity: number): number => {
    if (quantity <= 0) return 0;
    return totalPaid / quantity;
  };

  // Calcular precio total desde precio unitario
  const calculateTotalPaid = (unitPrice: number, quantity: number): number => {
    return unitPrice * quantity;
  };

  const calculateSubtotal = (itemId: string): number => {
    const editing = editingItems[itemId];
    if (!editing) return 0;
    
    if (inputMode === 'total') {
      // En modo total, usar totalPaid directamente
      return parseFloat(editing.totalPaid || '0') || 0;
    } else {
      // En modo unit, calcular desde precio unitario
      const qty = parseFloat(editing.purchasedQuantity) || 0;
      const unitPrice = parseFloat(editing.unitPrice || editing.price || '0') || 0;
      return calculateTotalPaid(unitPrice, qty);
    }
  };

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => {
      const subtotal = calculateSubtotal(item.id);
      // Solo sumar si el subtotal es mayor que 0
      return subtotal > 0 ? sum + subtotal : sum;
    }, 0);
  };

  const handleItemChange = (
    itemId: string,
    field: 'purchasedQuantity' | 'totalPaid' | 'unitPrice' | 'notes' | 'storeId',
    value: string
  ) => {
    setEditingItems((prev) => {
      const current = prev[itemId];
      if (!current) {
        // Si no existe, obtener valores del item original
        const item = items.find((i) => i.id === itemId);
        const qty = item?.purchasedQuantity || 0;
        const unitPrice = item?.price || 0;
        const totalPaid = qty * unitPrice;
        
        const base = {
          purchasedQuantity: qty.toString(),
          price: unitPrice.toString(),
          notes: item?.notes || '',
          storeId: item?.store?.id || '',
        };
        
        if (inputMode === 'total') {
          return {
            ...prev,
            [itemId]: {
              ...base,
              totalPaid: totalPaid.toString(),
              [field]: value,
            },
          };
        } else {
          return {
            ...prev,
            [itemId]: {
              ...base,
              unitPrice: unitPrice.toString(),
              [field]: value,
            },
          };
        }
      }
      
      const updated = { ...current, [field]: value };
      
      // Recalcular según el modo y el campo cambiado
      if (inputMode === 'total') {
        if (field === 'totalPaid' || field === 'purchasedQuantity') {
          const totalPaid = parseFloat(field === 'totalPaid' ? value : updated.totalPaid || '0') || 0;
          const qty = parseFloat(field === 'purchasedQuantity' ? value : updated.purchasedQuantity) || 0;
          const unitPrice = calculateUnitPrice(totalPaid, qty);
          updated.price = unitPrice.toString();
        }
      } else {
        // Modo unit
        if (field === 'unitPrice' || field === 'purchasedQuantity') {
          const unitPrice = parseFloat(field === 'unitPrice' ? value : updated.unitPrice || updated.price || '0') || 0;
          const qty = parseFloat(field === 'purchasedQuantity' ? value : updated.purchasedQuantity) || 0;
          const totalPaid = calculateTotalPaid(unitPrice, qty);
          updated.price = unitPrice.toString();
          // También actualizar totalPaid para cuando cambie de modo
          updated.totalPaid = totalPaid.toString();
        }
      }
      
      return {
        ...prev,
        [itemId]: updated,
      };
    });

    // Actualizar subtotal en tiempo real
    if (mode === 'edit' && (field === 'purchasedQuantity' || field === 'totalPaid' || field === 'unitPrice')) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const editing = editingItems[itemId] || {
              purchasedQuantity: item.purchasedQuantity.toString(),
              price: item.price.toString(),
            };
            const subtotal = calculateSubtotal(itemId);
            return {
              ...item,
              subtotal,
            };
          }
          return item;
        })
      );
    }

    // Actualizar el store en el item para mostrar el nombre
    if (field === 'storeId') {
      const selectedStore = stores.find((s) => s.id === value);
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              store: selectedStore || null,
            };
          }
          return item;
        })
      );
    }
  };

  // Función para cambiar entre modos
  const handleModeChange = (newMode: 'total' | 'unit') => {
    if (newMode === inputMode) return;
    
    setEditingItems((prev) => {
      const updated: typeof prev = {};
      
      Object.keys(prev).forEach((itemId) => {
        const current = prev[itemId];
        const qty = parseFloat(current.purchasedQuantity) || 0;
        
        if (newMode === 'total') {
          // Cambiar de unit a total: calcular totalPaid desde unitPrice
          const unitPrice = parseFloat(current.unitPrice || current.price || '0') || 0;
          const totalPaid = calculateTotalPaid(unitPrice, qty);
          updated[itemId] = {
            ...current,
            totalPaid: totalPaid.toString(),
            unitPrice: undefined,
            price: unitPrice.toString(), // Mantener precio unitario calculado
          };
        } else {
          // Cambiar de total a unit: calcular unitPrice desde totalPaid
          const totalPaid = parseFloat(current.totalPaid || '0') || 0;
          const unitPrice = calculateUnitPrice(totalPaid, qty);
          updated[itemId] = {
            ...current,
            unitPrice: unitPrice.toString(),
            totalPaid: undefined,
            price: unitPrice.toString(), // Mantener precio unitario calculado
          };
        }
      });
      
      return updated;
    });
    
    setInputMode(newMode);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      // Función auxiliar para obtener precio unitario desde editingItems según el modo
      const getUnitPrice = (editing: typeof editingItems[string]): number => {
        if (inputMode === 'total') {
          const totalPaid = parseFloat(editing.totalPaid || '0') || 0;
          const qty = parseFloat(editing.purchasedQuantity) || 0;
          return qty > 0 ? calculateUnitPrice(totalPaid, qty) : 0;
        } else {
          // Modo unit: usar unitPrice o price como fallback
          return parseFloat(editing.unitPrice || editing.price || '0') || 0;
        }
      };

      if (mode === 'create') {
        // En modo creación, también enviar items con precios y cantidades editados
        const itemsToCreate = items.map((item) => {
          const editing = editingItems[item.id];
          const unitPrice = getUnitPrice(editing);
          const qty = parseFloat(editing.purchasedQuantity) || item.purchasedQuantity;
          
          return {
            id: item.id.replace('temp-', ''), // Remover el prefijo temporal
            purchasedQuantity: qty,
            price: unitPrice, // Siempre enviar precio unitario calculado correctamente
            notes: editing.notes || null,
            storeId: editing.storeId || null,
          };
        });

        await onSave({
          purchasedAt: new Date(purchasedAt).toISOString(),
          notes: notes || undefined,
          items: itemsToCreate,
        });
      } else {
        // Modo edición: enviar items actualizados
        const itemsToUpdate = items.map((item) => {
          const editing = editingItems[item.id];
          const unitPrice = getUnitPrice(editing);
          const qty = parseFloat(editing.purchasedQuantity) || item.purchasedQuantity;
          
          return {
            id: item.id,
            purchasedQuantity: qty,
            price: unitPrice, // Siempre enviar precio unitario calculado correctamente
            notes: editing.notes || null,
            storeId: editing.storeId || null,
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
    const editing = editingItems[item.id];
    if (!editing) return false;
    
    // Verificar según el modo activo
    if (inputMode === 'total') {
      const totalPaid = parseFloat(editing.totalPaid || '0') || 0;
      return totalPaid > 0;
    } else {
      const unitPrice = parseFloat(editing.unitPrice || editing.price || '0') || 0;
      return unitPrice > 0;
    }
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

          {/* Toggle de modo de entrada */}
          <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">
                Modo de entrada de precios
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {inputMode === 'total'
                  ? 'Introduce el precio pagado y la cantidad, calcularemos el precio unitario'
                  : 'Introduce el precio unitario y la cantidad, calcularemos el precio pagado'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('total')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  inputMode === 'total'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Precio Total
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('unit')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  inputMode === 'unit'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Precio Unitario
              </button>
            </div>
          </div>

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
                storeId: item.store?.id || '',
              };
              const subtotal = calculateSubtotal(item.id);
              
              // Calcular valores según el modo
              const qty = parseFloat(editing.purchasedQuantity) || 0;
              let totalPaidValue = 0;
              let unitPriceValue = 0;
              
              if (inputMode === 'total') {
                totalPaidValue = parseFloat(editing.totalPaid || '0') || 0;
                unitPriceValue = qty > 0 ? calculateUnitPrice(totalPaidValue, qty) : 0;
              } else {
                unitPriceValue = parseFloat(editing.unitPrice || editing.price || '0') || 0;
                totalPaidValue = calculateTotalPaid(unitPriceValue, qty);
              }

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
                      <div className="text-xs text-gray-500">Total</div>
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
                    
                    {inputMode === 'total' ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Precio pagado (€) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editing.totalPaid || ''}
                            onChange={(e) =>
                              handleItemChange(item.id, 'totalPaid', e.target.value)
                            }
                            className="w-full rounded-md border border-blue-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Precio unitario calculado (€)
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={unitPriceValue > 0 ? unitPriceValue.toFixed(2) : '0.00'}
                            className="w-full rounded-md border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-600 cursor-not-allowed"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Precio unitario (€) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editing.unitPrice || editing.price || ''}
                            onChange={(e) =>
                              handleItemChange(item.id, 'unitPrice', e.target.value)
                            }
                            className="w-full rounded-md border border-blue-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Precio pagado calculado (€)
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={totalPaidValue > 0 ? totalPaidValue.toFixed(2) : '0.00'}
                            className="w-full rounded-md border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-600 cursor-not-allowed"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {mode === 'edit' && (
                    <>
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Comercio
                        </label>
                        <select
                          value={editing.storeId || ''}
                          onChange={(e) =>
                            handleItemChange(item.id, 'storeId', e.target.value)
                          }
                          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        >
                          <option value="">Sin comercio</option>
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.name}
                            </option>
                          ))}
                        </select>
                      </div>
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
                    </>
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

