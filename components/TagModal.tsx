'use client';

import { useEffect, useState } from 'react';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag?: {
    id: string;
    name: string;
    description?: string | null;
    isGeneral: boolean;
  } | null;
  onSuccess: () => void;
}

export default function TagModal({
  isOpen,
  onClose,
  tag,
  onSuccess,
}: TagModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGeneral, setIsGeneral] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setUserRole(data.user.role);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (tag) {
        setName(tag.name);
        setDescription(tag.description || '');
        setIsGeneral(tag.isGeneral);
      } else {
        setName('');
        setDescription('');
        setIsGeneral(false);
      }
      setError('');
      setFieldErrors({});
    }
  }, [isOpen, tag]);

  if (!isOpen) return null;

  const canCreatePublic = userRole && ['productos', 'recetas', 'admin', 'superadmin'].includes(userRole);

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
      const url = tag ? `/api/product-tags/${tag.id}` : '/api/product-tags';
      const method = tag ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          isGeneral: canCreatePublic ? isGeneral : false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details);
        }
        setError(data.error || 'Error al guardar el tag');
        setSaving(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError('Error de conexión');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {tag ? 'Editar Tag' : 'Nuevo Tag'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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
              onChange={(e) => setName(e.target.value)}
              className={`mt-1 block w-full rounded-md border ${
                fieldErrors.name
                  ? 'border-red-300'
                  : 'border-gray-300'
              } bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500`}
              placeholder="Nombre del tag"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Descripción opcional"
            />
          </div>

          {canCreatePublic && (
            <div className="flex items-center">
              <input
                id="isGeneral"
                type="checkbox"
                checked={isGeneral}
                onChange={(e) => setIsGeneral(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isGeneral" className="ml-2 text-sm text-gray-700">
                Tag general (disponible para todos)
              </label>
            </div>
          )}

          {!canCreatePublic && tag && tag.isGeneral && (
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
              Este tag es general. Solo los gestores pueden modificarlo.
            </div>
          )}

          <div className="flex justify-end space-x-3">
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
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : tag ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

