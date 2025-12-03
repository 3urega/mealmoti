'use client';

import { useEffect, useState } from 'react';

interface Store {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
  articlesCount: number;
}

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store?: Store | null;
  onSuccess: () => void;
}

const typeOptions = [
  { value: 'supermarket', label: 'Supermercado' },
  { value: 'specialty', label: 'Tienda Especializada' },
  { value: 'online', label: 'Tienda Online' },
  { value: 'other', label: 'Otro' },
];

export default function StoreModal({
  isOpen,
  onClose,
  store,
  onSuccess,
}: StoreModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'supermarket' | 'specialty' | 'online' | 'other'>('supermarket');
  const [address, setAddress] = useState('');
  const [isGeneral, setIsGeneral] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (store) {
        // Modo edición
        setName(store.name);
        setType(store.type as 'supermarket' | 'specialty' | 'online' | 'other');
        setAddress(store.address || '');
        setIsGeneral(store.isGeneral);
      } else {
        // Modo creación
        setName('');
        setType('supermarket');
        setAddress('');
        setIsGeneral(false);
      }
      setError('');
      setFieldErrors({});
    }
  }, [isOpen, store]);

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
      const url = store
        ? `/api/stores/${store.id}`
        : '/api/stores';
      const method = store ? 'PUT' : 'POST';

      const body: any = {
        name: name.trim(),
        type,
        address: address.trim() || undefined,
        isGeneral,
      };

      const res = await fetch(url, {
        method,
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
          setError(data.error || 'Error al guardar comercio');
        }
        setSaving(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Error de conexión');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {store ? 'Editar Comercio' : 'Nuevo Comercio'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            ✕
          </button>
        </div>

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
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700"
            >
              Dirección
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Ej: Calle Principal 123, Madrid"
            />
            <p className="mt-1 text-xs text-gray-500">
              Opcional. Útil para comercios físicos.
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
              onClick={onClose}
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
              {saving ? 'Guardando...' : store ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

