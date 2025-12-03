'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ListItem from '@/components/ListItem';
import ShareListModal from '@/components/ShareListModal';

interface ListItemData {
  id: string;
  name: string;
  quantity?: string | null;
  unit?: string | null;
  checked: boolean;
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
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchList();
  }, [listId]);

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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAdding(true);

    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName,
          quantity: newItemQuantity || undefined,
          unit: newItemUnit || undefined,
          notes: newItemNotes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al agregar el item');
        setAdding(false);
        return;
      }

      setNewItemName('');
      setNewItemQuantity('');
      setNewItemUnit('');
      setNewItemNotes('');
      setShowAddForm(false);
      fetchList();
    } catch (err) {
      setError('Error de conexión');
      setAdding(false);
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    updates: Partial<ListItemData>
  ) => {
    try {
      const res = await fetch(`/api/lists/${listId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
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

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      });
  }, []);

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
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <button
              onClick={() => setShowShareModal(true)}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Compartir
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {showAddForm ? 'Cancelar' : 'Agregar Item'}
            </button>
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
                htmlFor="itemName"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre *
              </label>
              <input
                id="itemName"
                type="text"
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Ej: Leche"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="itemQuantity"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cantidad
                </label>
                <input
                  id="itemQuantity"
                  type="text"
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
                  placeholder="litros"
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
              disabled={adding}
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
              canEdit={canEdit}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      )}

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

