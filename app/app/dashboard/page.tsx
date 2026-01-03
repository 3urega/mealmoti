'use client';

import { useEffect, useState } from 'react';

// Interfaces para los datos (simulando estructura de API)
interface DashboardStats {
  totalSpent: number;
  totalPurchases: number;
  totalItems: number;
  averagePurchaseValue: number;
  period: {
    start: string;
    end: string;
  };
}

interface TopItem {
  articleId: string;
  articleName: string;
  brand: string;
  totalQuantity: number;
  unit: string;
  totalSpent: number;
  purchaseCount: number;
}

interface StoreSpending {
  storeId: string;
  storeName: string;
  totalSpent: number;
  purchaseCount: number;
  averagePurchaseValue: number;
}

interface MonthlySpending {
  month: string;
  year: number;
  totalSpent: number;
  purchaseCount: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DashboardData {
  stats: DashboardStats;
  topItems: TopItem[];
  storeSpending: StoreSpending[];
  monthlySpending: MonthlySpending[];
  filteredUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  isAdminView?: boolean;
}

// Función para obtener datos del API
async function fetchDashboardData(userId?: string): Promise<DashboardData> {
  const url = userId 
    ? `/api/dashboard/stats?userId=${encodeURIComponent(userId)}`
    : '/api/dashboard/stats';
  
  const res = await fetch(url);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`);
  }
  
  return res.json();
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData(selectedUserId || undefined);
      if (isAdminUser()) {
        loadUsers();
      }
    }
  }, [currentUser, selectedUserId]);

  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadData = async (userId?: string) => {
    try {
      setLoading(true);
      setError('');
      const dashboardData = await fetchDashboardData(userId);
      setData(dashboardData);
    } catch (err) {
      setError('Error al cargar las estadísticas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isAdminUser = () => {
    return currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    setSelectedUserId(userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando estadísticas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-800">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { stats, topItems, storeSpending, monthlySpending } = data;

  // Calcular máximo para normalizar gráficos (con protección contra arrays vacíos)
  const maxStoreSpending = storeSpending.length > 0 
    ? Math.max(...storeSpending.map((s) => s.totalSpent))
    : 1;
  const maxMonthlySpending = monthlySpending.length > 0
    ? Math.max(...monthlySpending.map((m) => m.totalSpent))
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Compras</h1>
            <p className="mt-2 text-sm text-gray-600">
              Estadísticas de compras desde{' '}
              {new Date(stats.period.start).toLocaleDateString('es-ES')} hasta{' '}
              {new Date(stats.period.end).toLocaleDateString('es-ES')}
            </p>
            {data?.filteredUser && (
              <p className="mt-1 text-sm font-medium text-blue-600">
                Usuario: {data.filteredUser.name} ({data.filteredUser.email})
              </p>
            )}
            {data?.isAdminView && (
              <p className="mt-1 text-sm font-medium text-purple-600">
                Vista de administrador: Todos los usuarios
              </p>
            )}
          </div>
          {isAdminUser() && (
            <div className="flex items-center gap-4">
              <label htmlFor="user-select" className="text-sm font-medium text-gray-700">
                Filtrar por usuario:
              </label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={handleUserChange}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={loadingUsers}
              >
                <option value="">Todos los usuarios</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Gastado</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                €{stats.totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compras Realizadas</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.totalPurchases}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Items Comprados</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.totalItems}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ticket Medio</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                €{stats.averagePurchaseValue.toFixed(2)}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <svg
                className="h-6 w-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Top Items y Gasto por Comercio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Items Comprados */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Top Items Comprados
          </h2>
          <div className="space-y-4">
            {topItems.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No hay items comprados aún</p>
            ) : (
              topItems.map((item, index) => (
              <div key={item.articleId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.articleName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.brand} • {item.totalQuantity} {item.unit} •{' '}
                      {item.purchaseCount} compras
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    €{item.totalSpent.toFixed(2)}
                  </p>
                </div>
              </div>
              ))
            )}
          </div>
        </div>

        {/* Gasto por Comercio */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Gasto por Comercio
          </h2>
          <div className="space-y-4">
            {storeSpending.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No hay compras registradas en comercios aún</p>
            ) : (
              storeSpending.map((store) => (
              <div key={store.storeId}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {store.storeName}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    €{store.totalSpent.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{
                      width: `${(store.totalSpent / maxStoreSpending) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{store.purchaseCount} compras</span>
                  <span>Ticket medio: €{store.averagePurchaseValue.toFixed(2)}</span>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Gasto Mensual */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Evolución del Gasto Mensual
        </h2>
        <div className="flex items-end justify-between gap-2">
          {monthlySpending.length === 0 ? (
            <p className="w-full text-center text-sm text-gray-500 italic py-12">
              No hay compras registradas aún
            </p>
          ) : (
            monthlySpending.map((month) => (
            <div key={`${month.month}-${month.year}`} className="flex-1">
              <div className="relative flex h-48 flex-col justify-end">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-400 transition-all hover:from-blue-700 hover:to-blue-500"
                  style={{
                    height: `${(month.totalSpent / maxMonthlySpending) * 100}%`,
                  }}
                  title={`${month.month}: €${month.totalSpent.toFixed(2)}`}
                />
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs font-medium text-gray-900">
                  €{month.totalSpent.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500">{month.month}</p>
                <p className="text-xs text-gray-400">{month.purchaseCount} compras</p>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

