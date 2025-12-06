'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ShoppingListCard from '@/components/ShoppingListCard';

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

const categoryConfig = {
  draft: {
    title: 'Borradores',
    description: 'Listas en preparación',
    status: 'draft',
    type: 'all',
  },
  active: {
    title: 'Activas',
    description: 'Listas en uso',
    status: 'active',
    type: 'all',
  },
  shared: {
    title: 'Compartidas',
    description: 'Listas compartidas con otros',
    status: undefined,
    type: 'shared',
  },
  private: {
    title: 'Privadas',
    description: 'Solo para ti',
    status: undefined,
    type: 'private',
  },
};

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const config = categoryConfig[category as keyof typeof categoryConfig];

  useEffect(() => {
    if (!config) {
      router.push('/app');
      return;
    }
    fetchUser();
    fetchLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

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
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (config.status) {
        queryParams.append('status', config.status);
      }
      if (config.type) {
        queryParams.append('type', config.type);
      }

      const res = await fetch(`/api/lists?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLists(data.lists || []);
      } else {
        setError(data.error || 'Error al cargar las listas');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    router.push(`/app/lists/category/${newCategory}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            ← Volver al Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {config.title}
            </h1>
            <p className="mt-1 text-sm text-gray-600">{config.description}</p>
          </div>
        </div>
        <div>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            <option value="draft">Borradores</option>
            <option value="active">Activas</option>
            <option value="shared">Compartidas</option>
            <option value="private">Privadas</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {lists.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">
            No hay listas en esta categoría. Crea una nueva lista para comenzar.
          </p>
          <Link
            href="/app"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Crear Nueva Lista
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            {lists.length} {lists.length === 1 ? 'lista' : 'listas'} en esta
            categoría
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => {
              const completedCount = list.items.filter((item) => item.checked)
                .length;
              const isOwner = user ? list.ownerId === user.id : false;
              return (
                <ShoppingListCard
                  key={list.id}
                  id={list.id}
                  name={list.name}
                  description={list.description}
                  itemCount={list.items.length}
                  completedCount={completedCount}
                  isOwner={isOwner}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

