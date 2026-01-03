'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGeolocation } from '@/hooks/useGeolocation';

interface NearbyStore {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  distance: number;
  articlesCount: number;
}

interface NearbyStoresProps {
  radius?: number;
  limit?: number;
  onStoreSelect?: (storeId: string) => void;
}

const typeLabels: Record<string, string> = {
  supermarket: 'Supermercado',
  specialty: 'Tienda Especializada',
  online: 'Tienda Online',
  other: 'Otro',
};

export default function NearbyStores({
  radius = 10,
  limit = 20,
  onStoreSelect,
}: NearbyStoresProps) {
  const router = useRouter();
  const { latitude, longitude, getCurrentPosition, loading: geoLoading, error: geoError, supported: geoSupported } = useGeolocation();
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);

  const fetchNearbyStores = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        radius: radius.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/stores/nearby?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar comercios cercanos');
      }

      setStores(data.stores || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!geoSupported) {
      setError('La geolocalización no está soportada en tu navegador');
      return;
    }
    setHasRequestedLocation(true);
    getCurrentPosition();
  };

  useEffect(() => {
    if (latitude && longitude && hasRequestedLocation) {
      fetchNearbyStores(latitude, longitude);
    }
  }, [latitude, longitude, hasRequestedLocation]);

  const handleStoreClick = (storeId: string) => {
    if (onStoreSelect) {
      onStoreSelect(storeId);
    } else {
      router.push(`/app/stores/${storeId}`);
    }
  };

  if (!geoSupported) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Comercios Cercanos
        </h3>
        <p className="text-sm text-gray-600">
          La geolocalización no está disponible en tu navegador.
        </p>
      </div>
    );
  }

  if (!hasRequestedLocation && !latitude) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Comercios Cercanos
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Encuentra comercios cerca de tu ubicación actual.
        </p>
        <button
          onClick={handleGetLocation}
          disabled={geoLoading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {geoLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Obteniendo ubicación...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Buscar comercios cercanos
            </>
          )}
        </button>
        {geoError && (
          <p className="mt-2 text-sm text-red-600">
            Error: {geoError.message}
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Comercios Cercanos
        </h3>
        <p className="text-sm text-gray-600">Buscando comercios cercanos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Error
        </h3>
        <p className="text-sm text-red-800">{error}</p>
        <button
          onClick={() => {
            setError(null);
            if (latitude && longitude) {
              fetchNearbyStores(latitude, longitude);
            } else {
              handleGetLocation();
            }
          }}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Comercios Cercanos
        </h3>
        <p className="text-sm text-gray-600">
          No se encontraron comercios en un radio de {radius} km.
        </p>
        <button
          onClick={() => {
            setHasRequestedLocation(false);
            handleGetLocation();
          }}
          className="mt-4 text-sm text-blue-600 hover:text-blue-800"
        >
          Buscar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Comercios Cercanos
        </h3>
        <span className="text-sm text-gray-500">
          {stores.length} {stores.length === 1 ? 'comercio' : 'comercios'} en {radius} km
        </span>
      </div>
      <div className="space-y-3">
        {stores.map((store) => (
          <div
            key={store.id}
            onClick={() => handleStoreClick(store.id)}
            className="flex items-start justify-between p-4 rounded-md border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900">{store.name}</h4>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                  {typeLabels[store.type] || store.type}
                </span>
              </div>
              {store.address && (
                <p className="text-sm text-gray-600 mb-1">{store.address}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {store.distance} km
                </span>
                <span>{store.articlesCount} {store.articlesCount === 1 ? 'artículo' : 'artículos'}</span>
              </div>
            </div>
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

