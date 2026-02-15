'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MapboxLocationViewer from '@/components/MapboxLocationViewer';

interface Product {
  id: string;
  name: string;
}

interface Article {
  id: string;
  name: string;
  brand: string;
  variant?: string | null;
  product: Product;
  price?: number | null;
  available: boolean;
  lastCheckedAt?: string | null;
}

interface Store {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isGeneral: boolean;
  createdById?: string | null;
  articles?: Article[];
  articlesCount?: number;
}

const typeLabels: Record<string, string> = {
  supermarket: 'Supermercado',
  specialty: 'Tienda Especializada',
  online: 'Tienda Online',
  other: 'Otro',
};

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [availableFilter, setAvailableFilter] = useState<string>('all');
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);

  useEffect(() => {
    fetchStore();
  }, [storeId]);

  useEffect(() => {
    if (articlesLoaded) {
      fetchArticles();
    }
  }, [search, availableFilter, articlesLoaded]);

  const fetchStore = async () => {
    try {
      const res = await fetch(`/api/stores/${storeId}`);
      const data = await res.json();
      if (res.ok) {
        setStore({
          ...data.store,
          articles: undefined, // No cargar artículos inicialmente
        });
      } else {
        setError(data.error || 'Error al cargar el comercio');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    if (loadingArticles) return;
    
    setLoadingArticles(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (availableFilter !== 'all') {
        params.append('available', availableFilter);
      }

      const res = await fetch(`/api/stores/${storeId}/articles?${params}`);
      const data = await res.json();
      if (res.ok) {
        setStore((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            articles: data.articles,
          };
          });
      } else {
        setError(data.error || 'Error al cargar los artículos');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleLoadArticles = () => {
    if (!articlesLoaded) {
      setArticlesLoaded(true);
    } else {
      fetchArticles();
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => router.push('/app/stores')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← Volver a comercios
          </button>
        </div>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.push('/app/stores')}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Volver a comercios
        </button>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-600">
                {typeLabels[store.type] || store.type}
              </span>
              <span className="text-sm text-gray-500">
                {store.isGeneral ? 'General' : 'Particular'}
              </span>
            </div>
            {store.address && (
              <p className="mt-2 text-gray-600">{store.address}</p>
            )}
          </div>
          <button
            onClick={() => router.push(`/app/stores/${storeId}/edit`)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Mapa con ubicación */}
      {(store.latitude && store.longitude) && (
        <div className="mb-6">
          <MapboxLocationViewer
            latitude={store.latitude}
            longitude={store.longitude}
            address={store.address || undefined}
          />
        </div>
      )}

      {/* Sección de artículos */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Artículos
            {store.articlesCount !== undefined && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({store.articlesCount} {store.articlesCount === 1 ? 'artículo' : 'artículos'})
              </span>
            )}
          </h2>
          {!articlesLoaded && store.articlesCount !== undefined && store.articlesCount > 0 && (
            <button
              onClick={handleLoadArticles}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Cargar artículos
            </button>
          )}
        </div>

        {/* Filtros - solo mostrar si los artículos están cargados */}
        {articlesLoaded && (
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Buscar por nombre o marca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
        <select
          value={availableFilter}
          onChange={(e) => setAvailableFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        >
          <option value="all">Todos</option>
          <option value="true">Disponibles</option>
          <option value="false">No disponibles</option>
        </select>
      </div>
        )}

      {/* Lista de artículos */}
        {!articlesLoaded ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-600">
              {store.articlesCount === 0
                ? 'No hay artículos disponibles en este comercio.'
                : `Hay ${store.articlesCount} ${store.articlesCount === 1 ? 'artículo' : 'artículos'} disponibles. Haz clic en "Cargar artículos" para verlos.`}
            </p>
          </div>
        ) : loadingArticles ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-600">Cargando artículos...</p>
          </div>
        ) : !store.articles || store.articles.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">
              No hay artículos disponibles con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {store.articles.map((article) => (
            <div
              key={article.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{article.name}</h3>
                  <p className="text-sm text-gray-600">{article.brand}</p>
                  {article.variant && (
                    <p className="text-xs text-gray-500">{article.variant}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {article.product?.name ?? '-'}
                  </p>
                </div>
                {article.available ? (
                  <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                    Disponible
                  </span>
                ) : (
                  <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                    No disponible
                  </span>
                )}
              </div>
              {article.price !== null && article.price !== undefined && (
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  €{article.price.toFixed(2)}
                </p>
              )}
              {article.lastCheckedAt && (
                <p className="mt-2 text-xs text-gray-400">
                  Verificado:{' '}
                  {new Date(article.lastCheckedAt).toLocaleDateString()}
                </p>
              )}
              <button
                onClick={() => router.push(`/app/articles/${article.id}`)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800"
              >
                Ver detalles →
              </button>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}




