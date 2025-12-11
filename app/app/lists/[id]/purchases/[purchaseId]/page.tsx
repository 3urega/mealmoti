'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotification } from '@/contexts/NotificationContext';

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
    name: string;
    symbol: string;
  } | null;
  price: number;
  subtotal: number;
  store?: {
    id: string;
    name: string;
    type: string;
  } | null;
  notes?: string | null;
}

interface Purchase {
  id: string;
  totalPaid?: number | null;
  purchasedAt: string;
  notes?: string | null;
  items: PurchaseItem[];
  shoppingList: {
    id: string;
    name: string;
  };
}

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast, showConfirm } = useNotification();
  const listId = params.id as string;
  const purchaseId = params.purchaseId as string;
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetchPurchase();
  }, [purchaseId]);

  const fetchPurchase = async () => {
    try {
      // Obtener usuario actual primero
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      
      if (!userData.user) {
        setError('No autorizado');
        setLoading(false);
        return;
      }

      // Obtener la compra
      const res = await fetch(`/api/purchases/${purchaseId}`);
      const data = await res.json();
      if (res.ok) {
        setPurchase(data.purchase);
        // Verificar permisos de edición - obtener la lista completa para verificar owner y shares
        const listRes = await fetch(`/api/lists/${listId}`);
        const listData = await listRes.json();
        if (listData.list) {
          const isOwner = listData.list.ownerId === userData.user.id;
          const userShare = listData.list.shares?.find(
            (s: any) => s.user.id === userData.user.id
          );
          const canEditList = isOwner || (userShare?.canEdit ?? false);
          setCanEdit(canEditList);
        }
      } else {
        setError(data.error || 'Error al cargar la compra');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm(
      'Eliminar compra',
      '¿Estás seguro de que quieres eliminar esta compra? Esta acción no se puede deshacer.',
      {
        variant: 'danger',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      }
    );

    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/purchases/${purchaseId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al eliminar la compra');
        return;
      }

      showToast('success', 'Compra eliminada correctamente');
      router.push(`/app/lists/${listId}`);
    } catch (err) {
      setError('Error de conexión');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">{error || 'Compra no encontrada'}</p>
        <Link
          href={`/app/lists/${listId}`}
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          ← Volver a la lista
        </Link>
      </div>
    );
  }

  const purchaseDate = new Date(purchase.purchasedAt);
  const formattedDate = purchaseDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = purchaseDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const isToday = purchaseDate.toDateString() === new Date().toDateString();

  // Agrupar artículos por supermercado
  const itemsByStore = purchase.items.reduce((acc: any, item: PurchaseItem) => {
    const storeName = item.store?.name || 'Sin supermercado';
    if (!acc[storeName]) {
      acc[storeName] = [];
    }
    acc[storeName].push(item);
    return acc;
  }, {});

  const totalItems = purchase.items.length;
  const itemsWithPrice = purchase.items.filter((item) => item.price > 0).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/app/lists/${listId}`}
            className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Volver a la lista
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Detalle de Compra</h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <span>
              Lista: <span className="font-medium">{purchase.shoppingList.name}</span>
            </span>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              href={`/app/lists/${listId}`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              ✏️ Editar
            </Link>
            <button
              onClick={handleDelete}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              🗑️ Eliminar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      {/* Información de la compra */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de la Compra</h2>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Fecha:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {isToday ? 'Hoy' : formattedDate}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Hora:</span>
                <span className="ml-2 text-sm text-gray-900">{formattedTime}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Total pagado:</span>
                <span className="ml-2 text-lg font-bold text-green-600">
                  {purchase.totalPaid ? `€${purchase.totalPaid.toFixed(2)}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Artículos:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {totalItems} artículo{totalItems !== 1 ? 's' : ''}
                  {itemsWithPrice < totalItems && (
                    <span className="text-amber-600 ml-2">
                      ({itemsWithPrice} con precio)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
          {purchase.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notas</h3>
              <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-md">
                "{purchase.notes}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de artículos agrupados por supermercado */}
      <div className="space-y-6">
        {Object.entries(itemsByStore).map(([storeName, items]: [string, any]) => (
          <div key={storeName} className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>🏪</span>
                {storeName}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({items.length} artículo{items.length !== 1 ? 's' : ''})
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">
                      Artículo
                    </th>
                    <th className="text-right py-3 px-6 text-sm font-semibold text-gray-700">
                      Cantidad
                    </th>
                    <th className="text-right py-3 px-6 text-sm font-semibold text-gray-700">
                      Precio Unit.
                    </th>
                    <th className="text-right py-3 px-6 text-sm font-semibold text-gray-700">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item: PurchaseItem) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-medium text-gray-900">{item.article.name}</span>
                          <span className="text-gray-500 ml-2">({item.article.brand})</span>
                          <div className="text-xs text-gray-400 mt-1">
                            {item.article.product.name}
                          </div>
                          {item.notes && (
                            <div className="text-xs text-gray-500 italic mt-1">📝 {item.notes}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-gray-700">
                        {item.purchasedQuantity} {item.unit?.symbol || 'un'}
                      </td>
                      <td className="py-4 px-6 text-right text-gray-700">
                        {item.price > 0 ? `€${item.price.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-gray-900">
                        {item.subtotal > 0 ? `€${item.subtotal.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={3} className="py-3 px-6 text-right font-semibold text-gray-700">
                      Subtotal {storeName}:
                    </td>
                    <td className="py-3 px-6 text-right font-bold text-lg text-gray-900">
                      €
                      {items
                        .reduce((sum: number, item: PurchaseItem) => sum + item.subtotal, 0)
                        .toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen total */}
      {purchase.totalPaid && purchase.totalPaid > 0 && (
        <div className="mt-6 rounded-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-700">Total de la compra:</span>
            <span className="text-3xl font-bold text-green-600">
              €{purchase.totalPaid.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

