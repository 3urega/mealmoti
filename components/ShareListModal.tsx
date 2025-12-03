'use client';

import { useState } from 'react';

interface ShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  sharedUsers: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    canEdit: boolean;
  }>;
  onShare: (email: string, canEdit: boolean) => Promise<void>;
  onRemoveShare: (userId: string) => Promise<void>;
  isOwner: boolean;
}

export default function ShareListModal({
  isOpen,
  onClose,
  listId,
  sharedUsers,
  onShare,
  onRemoveShare,
  isOwner,
}: ShareListModalProps) {
  const [email, setEmail] = useState('');
  const [canEdit, setCanEdit] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSharing(true);

    try {
      await onShare(email, canEdit);
      setEmail('');
      setCanEdit(true);
    } catch (err: any) {
      setError(err.message || 'Error al compartir');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Compartir Lista</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {isOwner && (
          <form onSubmit={handleShare} className="mb-6 space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email del usuario
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div className="flex items-center">
              <input
                id="canEdit"
                type="checkbox"
                checked={canEdit}
                onChange={(e) => setCanEdit(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="canEdit" className="ml-2 text-sm text-gray-700">
                Permitir editar
              </label>
            </div>
            <button
              type="submit"
              disabled={sharing}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sharing ? 'Compartiendo...' : 'Compartir'}
            </button>
          </form>
        )}

        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Usuarios compartidos:
          </h3>
          {sharedUsers.length === 0 ? (
            <p className="text-sm text-gray-500">Ningún usuario compartido</p>
          ) : (
            <ul className="space-y-2">
              {sharedUsers.map((share) => (
                <li
                  key={share.user.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 p-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {share.user.name}
                    </p>
                    <p className="text-xs text-gray-500">{share.user.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                      {share.canEdit ? 'Puede editar' : 'Solo lectura'}
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => onRemoveShare(share.user.id)}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}


