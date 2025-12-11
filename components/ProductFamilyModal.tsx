'use client';

import { useEffect, useState } from 'react';

interface ProductFamily {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
  productsCount?: number;
}

interface ProductFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  family?: ProductFamily | null;
  onSuccess: () => void;
}

export default function ProductFamilyModal({
  isOpen,
  onClose,
  family,
  onSuccess,
}: ProductFamilyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGeneral, setIsGeneral] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (family) {
        // Modo edición
        setName(family.name);
        setDescription(family.description || '');
        setIsGeneral(family.isGeneral);
      } else {
        // Modo creación
        setName('');
        setDescription('');
        setIsGeneral(false);
      }
      setError('');
      setFieldErrors({});
    }
  }, [isOpen, family]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors({ name: 'El nombre es requerido' });
      return;
    }

    setSaving(true);

    try {
      const url = family
        ? `/api/product-families/${family.id}`
        : '/api/product-families';
      const method = family ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isGeneral,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details);
        } else {
          setError(data.error || 'Error al guardar la familia');
        }
        return;
      }

      onSuccess();
      onClose();
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
          {family ? 'Editar Familia' : 'Crear Familia'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors({ ...fieldErrors, name: '' });
              }}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                fieldErrors.name
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:outline-none focus:ring-red-500'
                  : 'border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500'
              }`}
              placeholder="Ej: Yogur, Carne, Pescado..."
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Descripción opcional de la familia..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isGeneral"
              checked={isGeneral}
              onChange={(e) => setIsGeneral(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isGeneral" className="ml-2 text-sm text-gray-700">
              Familia general (compartida con todos los usuarios)
            </label>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Guardando...' : family ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

