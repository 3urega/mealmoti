'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ArticleStoreModal from '@/components/ArticleStoreModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface Product {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  price?: number | null;
  available: boolean;
  lastCheckedAt?: string | null;
}

interface Article {
  id: string;
  name: string;
  product: Product;
  brand: string;
  variant?: string | null;
  suggestedPrice?: number | null;
  isGeneral: boolean;
  createdById?: string | null;
  stores: Store[];
  ingredients: Array<{
    id: string;
    name: string;
    isOptional: boolean;
  }>;
}

const typeLabels: Record<string, string> = {
  supermarket: 'Supermercado',
  specialty: 'Tienda Especializada',
  online: 'Tienda Online',
  other: 'Otro',
};

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);

  useEffect(() => {
    fetchUser();
    fetchArticle();
  }, [articleId]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  const fetchArticle = async () => {
    try {
      const res = await fetch(`/api/articles/${articleId}`);
      const data = await res.json();
      if (res.ok) {
        setArticle(data.article);
      } else {
        setError(data.error || 'Error al cargar el artículo');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStore = () => {
    setEditingStore(null);
    setShowStoreModal(true);
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setShowStoreModal(true);
  };

  const handleDeleteStore = (store: Store) => {
    setDeletingStore(store);
    setShowDeleteModal(true);
  };

  const handleStoreSaved = () => {
    setShowStoreModal(false);
    setEditingStore(null);
    fetchArticle();
  };

  const handleStoreDeleted = async () => {
    if (!deletingStore) return;

    try {
      const res = await fetch(
        `/api/articles/${articleId}/stores/${deletingStore.id}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok) {
        setShowDeleteModal(false);
        setDeletingStore(null);
        fetchArticle();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al eliminar la asociación');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => router.push('/app/articles')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← Volver a artículos
          </button>
        </div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  const isOwner = currentUser && article.createdById === currentUser.id;
  const canEdit = article.isGeneral || isOwner;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.push('/app/articles')}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Volver a artículos
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{article.name}</h1>
        <p className="mt-2 text-gray-600">
          {article.brand}
          {article.variant && ` - ${article.variant}`}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información del artículo */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Información
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Producto</dt>
              <dd className="mt-1 text-sm text-gray-900">{article.product.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Marca</dt>
              <dd className="mt-1 text-sm text-gray-900">{article.brand}</dd>
            </div>
            {article.variant && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Variante</dt>
                <dd className="mt-1 text-sm text-gray-900">{article.variant}</dd>
              </div>
            )}
            {article.suggestedPrice && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Precio sugerido
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  €{article.suggestedPrice.toFixed(2)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Tipo</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {article.isGeneral ? 'General' : 'Particular'}
              </dd>
            </div>
          </dl>

          {/* Ingredientes */}
          {article.ingredients.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium text-gray-500">
                Ingredientes
              </h3>
              <ul className="space-y-1">
                {article.ingredients.map((ing) => (
                  <li key={ing.id} className="text-sm text-gray-900">
                    {ing.name}
                    {ing.isOptional && (
                      <span className="ml-2 text-xs text-gray-500">
                        (opcional)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Comercios */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Comercios</h2>
            {canEdit && (
              <button
                onClick={handleAssignStore}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Asignar comercio
              </button>
            )}
          </div>

          {article.stores.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay comercios asignados a este artículo.
            </p>
          ) : (
            <div className="space-y-3">
              {article.stores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {store.name}
                      </h3>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {typeLabels[store.type] || store.type}
                      </span>
                      {store.available ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          Disponible
                        </span>
                      ) : (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                          No disponible
                        </span>
                      )}
                    </div>
                    {store.address && (
                      <p className="mt-1 text-xs text-gray-500">
                        {store.address}
                      </p>
                    )}
                    {store.price !== null && store.price !== undefined && (
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        €{store.price.toFixed(2)}
                      </p>
                    )}
                    {store.lastCheckedAt && (
                      <p className="mt-1 text-xs text-gray-400">
                        Verificado:{' '}
                        {new Date(store.lastCheckedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => handleEditStore(store)}
                        className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteStore(store)}
                        className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ArticleStoreModal
        isOpen={showStoreModal}
        onClose={() => {
          setShowStoreModal(false);
          setEditingStore(null);
        }}
        articleId={articleId}
        store={editingStore}
        onSave={handleStoreSaved}
      />

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingStore(null);
        }}
        onConfirm={handleStoreDeleted}
        title="Eliminar asociación"
        message={`¿Estás seguro de que quieres eliminar este artículo del comercio "${deletingStore?.name}"?`}
        itemName={deletingStore?.name || ''}
      />
    </div>
  );
}

