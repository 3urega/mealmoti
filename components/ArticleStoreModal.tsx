'use client';

import { useEffect, useState } from 'react';

interface Store {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  price?: number | null;
  available: boolean;
}

interface ArticleStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  store: Store | null;
  onSave: () => void;
}

export default function ArticleStoreModal({
  isOpen,
  onClose,
  articleId,
  store,
  onSave,
}: ArticleStoreModalProps) {
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [loadingStores, setLoadingStores] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [price, setPrice] = useState('');
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchStores();
      if (store) {
        setSelectedStoreId(store.id);
        setPrice(store.price?.toString() || '');
        setAvailable(store.available);
      } else {
        setSelectedStoreId('');
        setPrice('');
        setAvailable(true);
      }
      setError('');
    }
  }, [isOpen, store]);

  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const res = await fetch('/api/stores?limit=1000');
      const data = await res.json();
      if (res.ok) {
        setStores(data.stores || []);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const body: any = {
        storeId: selectedStoreId,
        available,
      };

      if (price.trim()) {
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
          setError('El precio debe ser un número positivo');
          setSaving(false);
          return;
        }
        body.price = priceNum;
      } else {
        body.price = null;
      }

      const res = await fetch(`/api/articles/${articleId}/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        onSave();
      } else {
        setError(data.error || 'Error al guardar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          {store ? 'Editar comercio' : 'Asignar comercio'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="storeId"
              className="block text-sm font-medium text-gray-700"
            >
              Comercio
            </label>
            <select
              id="storeId"
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              disabled={!!store}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Seleccionar comercio...</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700"
            >
              Precio (€)
            </label>
            <input
              type="number"
              id="price"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Opcional"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Disponible</span>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !selectedStoreId || loadingStores}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


