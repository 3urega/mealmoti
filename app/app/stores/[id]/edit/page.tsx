'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useNotification } from '@/contexts/NotificationContext';
import MapboxLocationPicker from '@/components/MapboxLocationPicker';

interface Store {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isGeneral: boolean;
  createdById?: string | null;
}

const typeOptions = [
  { value: 'supermarket', label: 'Supermercado' },
  { value: 'specialty', label: 'Tienda Especializada' },
  { value: 'online', label: 'Tienda Online' },
  { value: 'other', label: 'Otro' },
];

export default function EditStorePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useNotification();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [type, setType] = useState<'supermarket' | 'specialty' | 'online' | 'other'>('supermarket');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGeneral, setIsGeneral] = useState(false);

  useEffect(() => {
    fetchStore();
  }, [storeId]);

  const fetchStore = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stores/${storeId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar el comercio');
        return;
      }

      const storeData = data.store;
      setStore(storeData);
      setName(storeData.name);
      setType(storeData.type as 'supermarket' | 'specialty' | 'online' | 'other');
      setAddress(storeData.address || '');
      setLatitude(storeData.latitude ?? null);
      setLongitude(storeData.longitude ?? null);
      setIsGeneral(storeData.isGeneral);
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'El nombre es requerido';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) {
      return;
    }

    setSaving(true);

    try {
      const body: any = {
        name: name.trim(),
        type,
        address: address.trim() || undefined,
        latitude: latitude !== null ? latitude : undefined,
        longitude: longitude !== null ? longitude : undefined,
        isGeneral,
      };

      const res = await fetch(`/api/stores/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          // Errores de validación de Zod
          const zodErrors: Record<string, string> = {};
          data.details.forEach((err: any) => {
            if (err.path) {
              zodErrors[err.path[0]] = err.message;
            }
          });
          setFieldErrors(zodErrors);
        } else {
          setError(data.error || 'Error al actualizar comercio');
        }
        setSaving(false);
        return;
      }

      showToast('success', 'Comercio actualizado correctamente');
      router.push(`/app/stores/${storeId}`);
    } catch (err) {
      setError('Error de conexión');
      setSaving(false);
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
          onClick={() => router.push(`/app/stores/${storeId}`)}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Volver al comercio
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Editar Comercio</h1>
        <p className="mt-2 text-gray-600">
          Modifica la información del comercio "{store.name}"
        </p>
      </div>

      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.name;
                    return newErrors;
                  });
                }
              }}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 ${
                fieldErrors.name
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Ej: Mercadona, Carrefour, Tienda del barrio"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700"
            >
              Tipo de Comercio *
            </label>
            <select
              id="type"
              required
              value={type}
              onChange={(e) =>
                setType(e.target.value as 'supermarket' | 'specialty' | 'online' | 'other')
              }
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <MapboxLocationPicker
              initialLatitude={latitude}
              initialLongitude={longitude}
              initialAddress={address}
              onLocationChange={(lat, lng, addr) => {
                setLatitude(lat);
                setLongitude(lng);
                setAddress(addr || '');
              }}
            />
            <p className="mt-2 text-xs text-gray-500">
              Opcional. Busca una dirección o selecciona una ubicación en el mapa.
            </p>
          </div>

          <div className="flex items-center">
            <input
              id="isGeneral"
              type="checkbox"
              checked={isGeneral}
              onChange={(e) => setIsGeneral(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="isGeneral"
              className="ml-2 block text-sm text-gray-700"
            >
              Comercio general (visible para todos los usuarios)
            </label>
          </div>

          {isGeneral && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">
                Los comercios generales son visibles para todos los usuarios del
                sistema.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push(`/app/stores/${storeId}`)}
              disabled={saving}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

