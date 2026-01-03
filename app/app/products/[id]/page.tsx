'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SearchableArticleSelect from '@/components/SearchableArticleSelect';
import RequestPublicInclusionButton from '@/components/RequestPublicInclusionButton';
import TagSelector from '@/components/TagSelector';
import { useNotification } from '@/contexts/NotificationContext';

interface Article {
  id: string;
  name: string;
  brand: string;
  variant?: string | null;
  suggestedPrice?: number | null;
  isGeneral: boolean;
}

interface Ingredient {
  id: string;
  name: string;
  type: string;
  isOptional: boolean;
}

interface Subfamily {
  id: string;
  name: string;
  description?: string | null;
  familyId: string;
  family: {
    id: string;
    name: string;
    isGeneral: boolean;
  };
}

interface Variety {
  id: string;
  name: string;
  subfamilyId: string;
  subfamily: {
    id: string;
    name: string;
    familyId: string;
    family: {
      id: string;
      name: string;
      isGeneral: boolean;
    };
  };
}

interface Tag {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
  articles: Article[];
  ingredients: Ingredient[];
  subfamilies: Subfamily[];
  varieties: Variety[];
  tags: Tag[];
  articlesCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { showToast } = useNotification();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newArticleName, setNewArticleName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [tagError, setTagError] = useState('');

  useEffect(() => {
    fetchProduct();
    fetchUser();
  }, [productId]);

  useEffect(() => {
    if (product) {
      setSelectedTagIds(product.tags.map((tag) => tag.id));
    }
  }, [product]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      if (res.ok) {
        setProduct(data.product);
      } else {
        setError(data.error || 'Error al cargar el producto');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignArticle = async () => {
    if (!selectedArticleId) {
      setAssignError('Por favor selecciona un artículo');
      return;
    }

    setAssigning(true);
    setAssignError('');

    try {
      const res = await fetch(`/api/articles/${selectedArticleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: productId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAssignError(data.error || 'Error al asignar el artículo');
        return;
      }

      // Limpiar selección y recargar producto
      setSelectedArticleId('');
      await fetchProduct();
    } catch (err) {
      setAssignError('Error de conexión');
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateArticle = async () => {
    if (!newArticleName.trim()) {
      setCreateError('El nombre del artículo es requerido');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newArticleName.trim(),
          productId: productId,
          brand: 'genérico',
          isGeneral: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || 'Error al crear el artículo');
        return;
      }

      // Limpiar formulario, cerrar modal y recargar producto
      setNewArticleName('');
      setShowCreateModal(false);
      await fetchProduct();
    } catch (err) {
      setCreateError('Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  const handleAddTags = async () => {
    if (selectedTagIds.length === 0) {
      setTagError('Por favor selecciona al menos un tag');
      return;
    }

    setAddingTag(true);
    setTagError('');

    try {
      // Obtener tags actuales del producto
      const currentTagIds = product?.tags.map((tag) => tag.id) || [];
      
      // Encontrar tags nuevos que no están asignados
      const newTagIds = selectedTagIds.filter((id) => !currentTagIds.includes(id));

      if (newTagIds.length === 0) {
        setTagError('Todos los tags seleccionados ya están asignados');
        setAddingTag(false);
        return;
      }

      // Asignar cada tag nuevo
      const promises = newTagIds.map((tagId) =>
        fetch(`/api/products/${productId}/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tagId }),
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter((res) => !res.ok);

      if (errors.length > 0) {
        const errorData = await errors[0].json();
        setTagError(errorData.error || 'Error al añadir algunos tags');
        return;
      }

      // Recargar producto
      await fetchProduct();
      showToast('success', `${newTagIds.length} tag(s) añadido(s) correctamente`);
    } catch (err) {
      setTagError('Error de conexión');
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!confirm('¿Estás seguro de que quieres remover este tag?')) {
      return;
    }

    try {
      const res = await fetch(
        `/api/products/${productId}/tags?tagId=${tagId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Error al remover el tag');
        return;
      }

      // Recargar producto
      await fetchProduct();
      showToast('success', 'Tag removido correctamente');
    } catch (err) {
      alert('Error de conexión');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {error || 'Producto no encontrado'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/app/products"
            className="mb-2 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Volver a Productos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          {product.description && (
            <p className="mt-2 text-gray-600">{product.description}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                product.isGeneral
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {product.isGeneral ? 'General' : 'Particular'}
            </span>
            <span>{product.articlesCount} artículos</span>
            <span>{product.ingredients.length} ingredientes</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && product.createdById === user.id && (
            <RequestPublicInclusionButton
              itemType="product"
              itemId={product.id}
              isGeneral={product.isGeneral}
              isOwner={true}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Artículos asociados */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Artículos ({product.articles.length})
            </h2>
            <Link
              href={`/app/articles?productId=${productId}`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Ver todos →
            </Link>
          </div>

          {/* Selector para asignar artículos */}
          <div className="mb-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Asignar artículo
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableArticleSelect
                  value={selectedArticleId}
                  onChange={setSelectedArticleId}
                  placeholder="Buscar artículo sin producto asignado (mín. 3 caracteres)..."
                  searchEndpoint="/api/articles/search"
                  minChars={3}
                  debounceMs={1000}
                  excludeProductId={productId}
                />
              </div>
              <button
                onClick={handleAssignArticle}
                disabled={!selectedArticleId || assigning}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assigning ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
            {assignError && (
              <p className="text-sm text-red-600">{assignError}</p>
            )}
            <div className="mt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Crear nuevo artículo
              </button>
            </div>
          </div>

          {product.articles.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay artículos asociados a este producto.
            </p>
          ) : (
            <ul className="space-y-2">
              {product.articles.map((article) => (
                <li
                  key={article.id}
                  className="rounded-md border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                >
                  <Link
                    href={`/app/articles/${article.id}`}
                    className="block"
                  >
                    <div className="font-medium text-gray-900">
                      {article.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                      <span>
                        {article.brand}
                        {article.variant && ` • ${article.variant}`}
                      </span>
                      {article.suggestedPrice && (
                        <span className="font-semibold text-gray-900">
                          €{article.suggestedPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Ingredientes */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Ingredientes ({product.ingredients.length})
          </h2>

          {product.ingredients.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay ingredientes asociados a este producto.
            </p>
          ) : (
            <ul className="space-y-2">
              {product.ingredients.map((ingredient) => (
                <li
                  key={ingredient.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {ingredient.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({ingredient.type})
                    </span>
                  </div>
                  {ingredient.isOptional && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                      Opcional
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Organización: Subfamilias, Variedades y Tags */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Subfamilias */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Subfamilias ({product.subfamilies.length})
          </h2>
          {product.subfamilies.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay subfamilias asignadas.
            </p>
          ) : (
            <ul className="space-y-2">
              {product.subfamilies.map((subfamily) => (
                <li
                  key={subfamily.id}
                  className="rounded-md border border-gray-100 bg-gray-50 p-3"
                >
                  <Link
                    href={`/app/product-subfamilies/${subfamily.id}`}
                    className="block"
                  >
                    <div className="font-medium text-gray-900">
                      {subfamily.name}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Familia: {subfamily.family.name}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Variedades */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Variedades ({product.varieties.length})
          </h2>
          {product.varieties.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay variedades asignadas.
            </p>
          ) : (
            <ul className="space-y-2">
              {product.varieties.map((variety) => (
                <li
                  key={variety.id}
                  className="rounded-md border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="font-medium text-gray-900">
                    {variety.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {variety.subfamily.family.name} &gt; {variety.subfamily.name}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tags */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Tags ({product.tags.length})
          </h2>
          
          {/* Selector de tags */}
          <div className="mb-4">
            <TagSelector
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              error={tagError}
            />
            {tagError && (
              <p className="mt-1 text-sm text-red-600">{tagError}</p>
            )}
            <button
              onClick={handleAddTags}
              disabled={addingTag || selectedTagIds.length === 0}
              className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingTag ? 'Añadiendo...' : 'Añadir Tags'}
            </button>
          </div>

          {product.tags.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay tags asignados.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag.id}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${
                    tag.isGeneral
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-2 text-current hover:opacity-70"
                    title="Remover tag"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear nuevo artículo */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Crear nuevo artículo
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre del artículo
                </label>
                <input
                  type="text"
                  value={newArticleName}
                  onChange={(e) => {
                    setNewArticleName(e.target.value);
                    setCreateError('');
                  }}
                  placeholder="Ej: Leche entera"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateArticle();
                    } else if (e.key === 'Escape') {
                      setShowCreateModal(false);
                      setNewArticleName('');
                      setCreateError('');
                    }
                  }}
                />
              </div>
              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewArticleName('');
                    setCreateError('');
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateArticle}
                  disabled={!newArticleName.trim() || creating}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? 'Creando...' : 'Crear y asignar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

