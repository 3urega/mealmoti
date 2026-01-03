'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ShoppingListCard from '@/components/ShoppingListCard';

interface ShoppingList {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  status: string;
  recipeId?: string | null;
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
  const [mounted, setMounted] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    setMounted(true);
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
      console.log('Response from /api/lists:', { status: res.status, ok: res.ok, data });
      if (res.ok) {
        const listsData = data.lists || [];
        console.log('Setting lists:', listsData.length, 'lists');
        setLists(listsData);
      } else {
        console.error('Error response from /api/lists:', data);
        setError(data.error || 'Error al cargar las listas');
      }
    } catch (err) {
      console.error('Error fetching lists:', err);
      setError('Error de conexión al cargar las listas');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar listas por categoría usando useMemo para evitar recálculos innecesarios
  // El API ya filtra las listas por usuario, así que todas las listas recibidas son válidas
  const listsByCategory = useMemo(() => {
    if (!mounted) {
      return {
        drafts: [],
        active: [],
        shared: [],
        private: [],
        fromRecipes: [],
        all: [],
        other: [],
      };
    }

    // El API ya filtró las listas, así que todas son del usuario o compartidas con él
    const userLists = lists;

    // Borradores: listas con status 'draft' que son del usuario
    const drafts = userLists.filter(
      (list) => list.status === 'draft' && (!user || list.ownerId === user.id)
    );

    // Activas: listas con status 'active' que son del usuario
    const active = userLists.filter(
      (list) => list.status === 'active' && (!user || list.ownerId === user.id)
    );

    // Compartidas: listas que tienen shares (pueden ser propias o compartidas con el usuario)
    const shared = userLists.filter(
      (list) => list.shares && list.shares.length > 0
    );

    // Privadas: listas del usuario sin compartir y que no son draft ni active
    const privateLists = userLists.filter(
      (list) =>
        (!user || list.ownerId === user.id) &&
        (!list.shares || list.shares.length === 0) &&
        list.status !== 'draft' &&
        list.status !== 'active'
    );

    // Desde Recetas: listas creadas desde recetas
    const fromRecipes = userLists.filter(
      (list) => list.recipeId !== null && list.recipeId !== undefined
    );

    // Encontrar listas que no están en ninguna categoría específica
    const categorizedListIds = new Set([
      ...drafts.map(l => l.id),
      ...active.map(l => l.id),
      ...shared.map(l => l.id),
      ...privateLists.map(l => l.id),
      ...fromRecipes.map(l => l.id),
    ]);
    
    const other = userLists.filter(
      list => !categorizedListIds.has(list.id)
    );

    return { drafts, active, shared, private: privateLists, fromRecipes, all: userLists, other };
  }, [lists, user, mounted]);

  // Calcular estadísticas de una lista
  const getListStats = (list: ShoppingList) => {
    const itemCount = list.items?.length || 0;
    const completedCount = list.items?.filter((item) => item.checked).length || 0;
    const isOwner = list.ownerId === user?.id;
    return { itemCount, completedCount, isOwner };
  };

  // Debug: actualizar info de debug solo en cliente
  useEffect(() => {
    console.log('Debug useEffect triggered:', { mounted, listsLength: lists.length, user: user?.name || 'null' });
    
    if (mounted) {
      console.log('Mounted state:', mounted);
      console.log('Lists state:', lists);
      console.log('User state:', user);
      console.log('ListsByCategory:', listsByCategory);
      
      if (lists.length > 0) {
        // Actualizar debug info para mostrar en UI
        const statusCounts = lists.reduce((acc, list) => {
          acc[list.status] = (acc[list.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        setDebugInfo(
          `Total: ${lists.length} | Usuario: ${user ? user.name : 'No cargado'} | ` +
          `Status: ${JSON.stringify(statusCounts)} | ` +
          `Categorías: Borradores(${listsByCategory.drafts.length}) ` +
          `Activas(${listsByCategory.active.length}) ` +
          `Compartidas(${listsByCategory.shared.length}) ` +
          `Privadas(${listsByCategory.private.length}) ` +
          `Desde Recetas(${listsByCategory.fromRecipes.length}) ` +
          `Otras(${listsByCategory.other.length})`
        );
      } else {
        setDebugInfo(`No hay listas cargadas. Mounted: ${mounted}, User: ${user ? user.name : 'null'}`);
      }
    }
  }, [mounted, lists, user, listsByCategory]);

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
        <div className="text-gray-600">Cargando listas...</div>
      </div>
    );
  }

  // Mostrar error si hay uno
  if (error && !lists.length) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="mb-2 text-lg font-semibold text-red-900">Error al cargar las listas</h2>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => {
            setError('');
            setLoading(true);
            fetchLists();
          }}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Reintentar
        </button>
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

      {/* Sección de Borradores */}
      <div className="mb-8 rounded-xl bg-amber-50 p-6">
        <h2 className="mb-4 text-2xl font-bold text-amber-900">Borradores</h2>
        <p className="mb-4 text-sm text-amber-700">
          Listas en preparación ({listsByCategory.drafts.length})
        </p>
        {listsByCategory.drafts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listsByCategory.drafts.map((list) => {
              const { itemCount, completedCount, isOwner } = getListStats(list);
              return (
                <ShoppingListCard
                  key={list.id}
                  id={list.id}
                  name={list.name}
                  description={list.description}
                  itemCount={itemCount}
                  completedCount={completedCount}
                  isOwner={isOwner}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-amber-600 italic">No hay listas en borradores</p>
        )}
      </div>

      {/* Sección de Activas */}
      <div className="mb-8 rounded-xl bg-blue-50 p-6">
        <h2 className="mb-4 text-2xl font-bold text-blue-900">Activas</h2>
        <p className="mb-4 text-sm text-blue-700">
          Listas en uso ({listsByCategory.active.length})
        </p>
        {listsByCategory.active.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listsByCategory.active.map((list) => {
              const { itemCount, completedCount, isOwner } = getListStats(list);
              return (
                <ShoppingListCard
                  key={list.id}
                  id={list.id}
                  name={list.name}
                  description={list.description}
                  itemCount={itemCount}
                  completedCount={completedCount}
                  isOwner={isOwner}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-blue-600 italic">No hay listas activas</p>
        )}
      </div>

      {/* Sección de Compartidas */}
      <div className="mb-8 rounded-xl bg-purple-50 p-6">
        <h2 className="mb-4 text-2xl font-bold text-purple-900">Compartidas</h2>
        <p className="mb-4 text-sm text-purple-700">
          Listas compartidas con otros ({listsByCategory.shared.length})
        </p>
        {listsByCategory.shared.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listsByCategory.shared.map((list) => {
              const { itemCount, completedCount, isOwner } = getListStats(list);
              return (
                <ShoppingListCard
                  key={list.id}
                  id={list.id}
                  name={list.name}
                  description={list.description}
                  itemCount={itemCount}
                  completedCount={completedCount}
                  isOwner={isOwner}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-purple-600 italic">No hay listas compartidas</p>
        )}
      </div>

      {/* Sección de Privadas */}
      <div className="mb-8 rounded-xl bg-green-50 p-6">
        <h2 className="mb-4 text-2xl font-bold text-green-900">Privadas</h2>
        <p className="mb-4 text-sm text-green-700">
          Solo para ti ({listsByCategory.private.length})
        </p>
        {listsByCategory.private.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listsByCategory.private.map((list) => {
              const { itemCount, completedCount, isOwner } = getListStats(list);
              return (
                <ShoppingListCard
                  key={list.id}
                  id={list.id}
                  name={list.name}
                  description={list.description}
                  itemCount={itemCount}
                  completedCount={completedCount}
                  isOwner={isOwner}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-green-600 italic">No hay listas privadas</p>
        )}
      </div>

      {/* Sección de Desde Recetas */}
      <div className="mb-8 rounded-xl bg-orange-50 p-6">
        <h2 className="mb-4 text-2xl font-bold text-orange-900">Desde Recetas</h2>
        <p className="mb-4 text-sm text-orange-700">
          Listas creadas desde recetas ({listsByCategory.fromRecipes.length})
        </p>
        {listsByCategory.fromRecipes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listsByCategory.fromRecipes.map((list) => {
              const { itemCount, completedCount, isOwner } = getListStats(list);
              return (
                <ShoppingListCard
                  key={list.id}
                  id={list.id}
                  name={list.name}
                  description={list.description}
                  itemCount={itemCount}
                  completedCount={completedCount}
                  isOwner={isOwner}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-orange-600 italic">No hay listas desde recetas</p>
        )}
      </div>


      {/* Sección de Otras Listas - para listas con otros status (completed, archived, periodica, etc) */}
      {listsByCategory.other.length > 0 && (
        <div className="mb-8 rounded-xl bg-gray-50 p-6">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Otras Listas</h2>
          <p className="mb-4 text-sm text-gray-700">
            Listas con otros estados ({listsByCategory.other.length})
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listsByCategory.other.map((list) => {
              const { itemCount, completedCount, isOwner } = getListStats(list);
              return (
                <ShoppingListCard
                  key={list.id}
                  id={list.id}
                  name={list.name}
                  description={list.description}
                  itemCount={itemCount}
                  completedCount={completedCount}
                  isOwner={isOwner}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay listas */}
      {mounted && lists.length === 0 && !loading && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-lg text-gray-600 mb-4">
            No tienes listas de compra aún. ¡Crea tu primera lista para comenzar!
          </p>
          <p className="text-sm text-gray-500">
            Usuario: {user ? user.name : 'No cargado'} | Listas recibidas: {lists.length}
          </p>
        </div>
      )}

      {/* Debug: mostrar información de las listas - solo en cliente */}
      {mounted && (
        <details className="mb-8 rounded-lg border border-gray-300 bg-gray-100 p-4 text-xs">
          <summary className="cursor-pointer font-bold">Debug Info (click para ver)</summary>
          <div className="mt-2 whitespace-pre-wrap">
            {debugInfo || 'Debug info no disponible aún'}
            <br />
            <br />
            <strong>Estado actual:</strong>
            <br />
            - Mounted: {mounted ? 'Sí' : 'No'}
            <br />
            - Loading: {loading ? 'Sí' : 'No'}
            <br />
            - Listas: {lists.length}
            <br />
            - Usuario: {user ? `${user.name} (${user.id})` : 'No cargado'}
            <br />
            - ListsByCategory.all: {listsByCategory.all.length}
          </div>
        </details>
      )}
    </div>
  );
}

