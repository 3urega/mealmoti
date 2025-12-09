'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ListItem from '@/components/ListItem';
import ShareListModal from '@/components/ShareListModal';
import PurchaseModal from '@/components/PurchaseModal';

interface Article {
  id: string;
  name: string;
  brand: string;
  variant?: string | null;
  product: {
    id: string;
    name: string;
  };
}

interface Store {
  id: string;
  name: string;
  type: string;
}

interface ListItemData {
  id: string;
  articleId: string;
  article: Article;
  quantity: number;
  unit?: string | null;
  unitId?: string | null;
  unitRelation?: {
    id: string;
    name: string;
    symbol: string;
  } | null;
  checked: boolean;
  purchasedQuantity?: number | null;
  price?: number | null;
  purchasedAt?: string | null;
  storeId?: string | null;
  store?: Store | null;
  notes?: string | null;
  addedBy?: {
    id: string;
    name: string;
  } | null;
}

interface ShoppingList {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  status: string;
  totalCost?: number | null;
  statusDate: string;
  isTemplate: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  items: ListItemData[];
  shares: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    canEdit: boolean;
  }>;
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemArticleId, setNewItemArticleId] = useState('');
  const [newItemStoreId, setNewItemStoreId] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('unidades');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseModalMode, setPurchaseModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  useEffect(() => {
    fetchList();
    fetchArticles();
    fetchStores();
    fetchPurchases();
  }, [listId]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      });
  }, []);

  const fetchList = async () => {
    try {
      const res = await fetch(`/api/lists/${listId}`);
      const data = await res.json();
      if (res.ok) {
        setList(data.list);
      } else {
        setError(data.error || 'Error al cargar la lista');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    setLoadingArticles(true);
    try {
      const res = await fetch('/api/articles?limit=100');
      const data = await res.json();
      if (res.ok) {
        setArticles(data.articles || []);
      }
    } catch (err) {
      console.error('Error al cargar artículos:', err);
    } finally {
      setLoadingArticles(false);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores?limit=100');
      const data = await res.json();
      if (res.ok) {
        setStores(data.stores || []);
      }
    } catch (err) {
      console.error('Error al cargar comercios:', err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newItemArticleId) {
      setError('Debes seleccionar un artículo');
      return;
    }

    const quantity = parseFloat(newItemQuantity);
    if (!quantity || quantity <= 0) {
      setError('La cantidad debe ser un número positivo');
      return;
    }

    setAdding(true);

    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: newItemArticleId,
          quantity: quantity,
          unit: newItemUnit || 'unidades',
          storeId: newItemStoreId || undefined,
          notes: newItemNotes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al agregar el item');
        setAdding(false);
        return;
      }

      setNewItemArticleId('');
      setNewItemStoreId('');
      setNewItemQuantity('');
      setNewItemUnit('unidades');
      setNewItemNotes('');
      setShowAddForm(false);
      fetchList();
    } catch (err) {
      setError('Error de conexión');
      setAdding(false);
    }
  };

  const handleUpdateItem = async (itemId: string, updates: any) => {
    try {
      // Convertir campos numéricos si están presentes como strings
      const processedUpdates: any = { ...updates };
      if (updates.quantity !== undefined) {
        processedUpdates.quantity =
          typeof updates.quantity === 'string'
            ? parseFloat(updates.quantity)
            : updates.quantity;
      }
      if (updates.purchasedQuantity !== undefined) {
        processedUpdates.purchasedQuantity =
          typeof updates.purchasedQuantity === 'string'
            ? parseFloat(updates.purchasedQuantity) || null
            : updates.purchasedQuantity;
      }
      if (updates.price !== undefined) {
        processedUpdates.price =
          typeof updates.price === 'string'
            ? parseFloat(updates.price) || null
            : updates.price;
      }

      const res = await fetch(`/api/lists/${listId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedUpdates),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al actualizar el item');
        return;
      }

      fetchList();
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/lists/${listId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al eliminar el item');
        return;
      }

      fetchList();
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const handleShare = async (email: string, canEdit: boolean) => {
    const res = await fetch(`/api/lists/${listId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, canEdit }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al compartir');
    }

    fetchList();
  };

  const handleRemoveShare = async (userId: string) => {
    try {
      const res = await fetch(`/api/lists/${listId}/share/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al remover acceso');
        return;
      }

      fetchList();
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const fetchPurchases = async () => {
    setLoadingPurchases(true);
    try {
      const res = await fetch(`/api/lists/${listId}/purchases`);
      const data = await res.json();
      if (res.ok && data.purchases) {
        setPurchases(data.purchases);
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleResetList = async () => {
    if (!confirm('¿Estás seguro de que quieres resetear todos los artículos comprados? Esto marcará todos los items como no comprados.')) {
      return;
    }

    try {
      const res = await fetch(`/api/lists/${listId}/items/reset`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al resetear la lista');
        return;
      }

      alert(`✅ ${data.message}`);
      fetchList();
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const handleCreatePurchase = async (data: {
    purchasedAt: string;
    notes?: string;
  }) => {
    const res = await fetch(`/api/lists/${listId}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Error al registrar la compra');
    }

    // Recargar lista y compras
    fetchList();
    fetchPurchases();
  };

  const handleEditPurchase = async (data: {
    purchasedAt: string;
    notes?: string;
    items?: Array<{
      id: string;
      purchasedQuantity?: number;
      price?: number;
      notes?: string | null;
    }>;
  }) => {
    if (!selectedPurchase) return;

    const res = await fetch(`/api/purchases/${selectedPurchase.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Error al actualizar la compra');
    }

    // Recargar compras
    fetchPurchases();
    setSelectedPurchase(null);
  };

  const handleOpenPurchaseModal = (mode: 'create' | 'edit', purchase?: any) => {
    setPurchaseModalMode(mode);
    setSelectedPurchase(purchase);
    setShowPurchaseModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">{error || 'Lista no encontrada'}</p>
      </div>
    );
  }

  const isOwner = currentUser ? list.ownerId === currentUser.id : false;
  const userShare = list.shares.find(
    (s) => currentUser && s.user.id === currentUser.id
  );
  const canEdit = isOwner || (userShare?.canEdit ?? false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{list.name}</h1>
          {list.description && (
            <p className="mt-1 text-gray-600">{list.description}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <span>
              Estado: <span className="font-medium">{list.status}</span>
            </span>
            {list.totalCost !== null && list.totalCost !== undefined && (
              <span>
                Total: <span className="font-medium">€{list.totalCost.toFixed(2)}</span>
              </span>
            )}
            {list.isTemplate && (
              <span className="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-800">
                Plantilla
              </span>
            )}
            {list.status === 'periodica' && (
              <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800">
                Periódica
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <>
              <select
                value={list.status}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  try {
                    const res = await fetch(`/api/lists/${listId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: newStatus }),
                    });
                    if (res.ok) {
                      fetchList();
                    } else {
                      const data = await res.json();
                      setError(data.error || 'Error al actualizar estado');
                    }
                  } catch (err) {
                    setError('Error de conexión');
                  }
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="draft">Borrador</option>
                <option value="active">Activa</option>
                <option value="completed">Completada</option>
                <option value="archived">Archivada</option>
                <option value="periodica">Periódica</option>
              </select>
              <button
                onClick={() => setShowShareModal(true)}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Compartir
              </button>
            </>
          )}
          {canEdit && (
            <>
              {/* Botón de registrar compra - visible si hay items comprados */}
              {list.items.some(item => item.checked) && (
                <button
                  onClick={() => handleOpenPurchaseModal('create')}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 flex items-center gap-2"
                  title="Registrar compra con los artículos marcados"
                >
                  💳 Registrar Compra
                </button>
              )}
              {/* Botón de resetear - visible si hay items comprados o si la lista es periódica */}
              {(list.items.some(item => item.checked) || list.status === 'periodica') && (
                <button
                  onClick={handleResetList}
                  className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                  title="Resetear todos los artículos comprados"
                >
                  Reiniciar Compra
                </button>
              )}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {showAddForm ? 'Cancelar' : 'Agregar Item'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Agregar Item
          </h2>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <label
                htmlFor="itemArticle"
                className="block text-sm font-medium text-gray-700"
              >
                Artículo *
              </label>
              <select
                id="itemArticle"
                required
                value={newItemArticleId}
                onChange={(e) => setNewItemArticleId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={loadingArticles}
              >
                <option value="">
                  {loadingArticles ? 'Cargando...' : 'Selecciona un artículo'}
                </option>
                {articles.map((article) => (
                  <option key={article.id} value={article.id}>
                    {article.name} ({article.brand}) - {article.product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="itemStore"
                className="block text-sm font-medium text-gray-700"
              >
                Comercio (opcional)
              </label>
              <select
                id="itemStore"
                value={newItemStoreId}
                onChange={(e) => setNewItemStoreId(e.target.value)}
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
                  htmlFor="itemQuantity"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cantidad *
                </label>
                <input
                  id="itemQuantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="2"
                />
              </div>
              <div>
                <label
                  htmlFor="itemUnit"
                  className="block text-sm font-medium text-gray-700"
                >
                  Unidad
                </label>
                <input
                  id="itemUnit"
                  type="text"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="unidades"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="itemNotes"
                className="block text-sm font-medium text-gray-700"
              >
                Notas
              </label>
              <textarea
                id="itemNotes"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Notas adicionales..."
              />
            </div>
            <button
              type="submit"
              disabled={adding || !newItemArticleId}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? 'Agregando...' : 'Agregar'}
            </button>
          </form>
        </div>
      )}

      {list.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">
            No hay items en esta lista. Agrega el primero para comenzar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.items.map((item) => (
            <ListItem
              key={item.id}
              {...item}
              unit={item.unitRelation?.symbol || item.unit || 'un'}
              canEdit={canEdit}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      )}

      {/* Historial de Compras */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">💰</span>
            Historial de Compras
            {purchases.length > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {purchases.length}
              </span>
            )}
          </h2>
        </div>

        {loadingPurchases ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando compras...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-600 font-medium mb-2">
              Aún no has registrado compras para esta lista
            </p>
            <p className="text-sm text-gray-500">
              Marca artículos como comprados y usa "💳 Registrar Compra" para crear un registro
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => {
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

              return (
                <div
                  key={purchase.id}
                  className="group rounded-lg border-2 border-gray-200 bg-gradient-to-r from-white to-gray-50 p-5 hover:border-green-300 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleOpenPurchaseModal('edit', purchase)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 capitalize text-lg">
                          {isToday ? 'Hoy' : formattedDate}
                        </h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {formattedTime}
                        </span>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                          {purchase.items.length} artículo{purchase.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {purchase.notes && (
                        <p className="text-sm text-gray-600 mb-2 italic">
                          "{purchase.notes}"
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>Haz clic para ver detalles</span>
                      </div>
                    </div>
                    <div className="text-right ml-6 flex flex-col items-end">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {purchase.totalPaid
                          ? `€${purchase.totalPaid.toFixed(2)}`
                          : '—'}
                      </div>
                      {purchase.totalPaid && (
                        <div className="text-xs text-gray-500">
                          Total pagado
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPurchaseModal('edit', purchase);
                        }}
                        className="mt-3 px-4 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Compra */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setSelectedPurchase(null);
        }}
        mode={purchaseModalMode}
        checkedItems={
          purchaseModalMode === 'create'
            ? list.items
                .filter((item) => item.checked)
                .map((item) => ({
                  id: item.id,
                  article: item.article,
                  quantity: item.quantity,
                  purchasedQuantity: item.purchasedQuantity,
                  price: item.price,
                  unit: item.unitRelation
                    ? { id: item.unitRelation.id, symbol: item.unitRelation.symbol }
                    : item.unit
                    ? { id: item.unitId || '', symbol: item.unit }
                    : null,
                  store: item.store,
                  notes: item.notes,
                }))
            : undefined
        }
        purchase={purchaseModalMode === 'edit' ? selectedPurchase : undefined}
        onSave={
          purchaseModalMode === 'create' ? handleCreatePurchase : handleEditPurchase
        }
      />

      <ShareListModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        listId={listId}
        sharedUsers={list.shares}
        onShare={handleShare}
        onRemoveShare={handleRemoveShare}
        isOwner={isOwner}
      />
    </div>
  );
}

