'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CategoryCard from '@/components/CategoryCard';

interface ShoppingList {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  status: string;
  items: Array<{ id: string; checked: boolean }>;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  shares: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface User {
  id: string;
  email: string;
  name: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser();
    fetchLists();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/lists');
      const data = await res.json();
      if (res.ok) {
        setLists(data.lists || []);
      }
    } catch (err) {
      console.error('Error fetching lists:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular contadores de categorías
  const getCategoryCounts = () => {
    if (!user) return { drafts: 0, active: 0, shared: 0, private: 0 };

    const drafts = lists.filter(
      (list) => list.status === 'draft' && list.ownerId === user.id
    ).length;

    const active = lists.filter(
      (list) => list.status === 'active' && list.ownerId === user.id
    ).length;

    const shared = lists.filter(
      (list) => list.shares && list.shares.length > 0
    ).length;

    const privateLists = lists.filter(
      (list) =>
        list.ownerId === user.id &&
        (!list.shares || list.shares.length === 0)
    ).length;

    return { drafts, active, shared, private: privateLists };
  };

  const categoryCounts = getCategoryCounts();

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName,
          description: newListDescription || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al crear la lista');
        setCreating(false);
        return;
      }

      setNewListName('');
      setNewListDescription('');
      setShowCreateForm(false);
      fetchLists();
      router.push(`/app/lists/${data.list.id}`);
    } catch (err) {
      setError('Error de conexión');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Mis Listas</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancelar' : 'Nueva Lista'}
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Crear Nueva Lista
          </h2>
          <form onSubmit={handleCreateList} className="space-y-4">
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
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Ej: Compra semanal"
              />
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
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Descripción opcional..."
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {creating ? 'Creando...' : 'Crear Lista'}
            </button>
          </form>
        </div>
      )}

      <div className="mb-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
          <CategoryCard
            title="Borradores"
            description="Listas en preparación"
            count={categoryCounts.drafts}
            color="from-amber-500 to-amber-600"
            href="/app/lists/category/draft"
            icon={
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            }
          />
          <CategoryCard
            title="Activas"
            description="Listas en uso"
            count={categoryCounts.active}
            color="from-blue-500 to-blue-600"
            href="/app/lists/category/active"
            icon={
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <CategoryCard
            title="Compartidas"
            description="Listas compartidas con otros"
            count={categoryCounts.shared}
            color="from-purple-500 to-purple-600"
            href="/app/lists/category/shared"
            icon={
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
          />
          <CategoryCard
            title="Privadas"
            description="Solo para ti"
            count={categoryCounts.private}
            color="from-green-500 to-green-600"
            href="/app/lists/category/private"
            icon={
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

