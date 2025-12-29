'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotification } from '@/contexts/NotificationContext';
import SearchableProductSelect from '@/components/SearchableProductSelect';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import IngredientSearchInput from '@/components/IngredientSearchInput';

interface Product {
  id: string;
  name: string;
  description?: string | null;
}

interface Ingredient {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  isOptional: boolean;
}

interface Article {
  id: string;
  name: string;
  description?: string | null;
  productId: string;
  product: Product;
  brand: string;
  variant?: string | null;
  weightInGrams?: number | null;
  suggestedPrice?: number | null;
  isGeneral: boolean;
  createdById?: string | null;
  ingredients: Ingredient[];
  createdAt: string;
  updatedAt: string;
}

export default function ArticleEditPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useNotification();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('');
  const [brand, setBrand] = useState('');
  const [variant, setVariant] = useState('');
  const [weightInGrams, setWeightInGrams] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [isGeneral, setIsGeneral] = useState(false);

  // Ingredients management
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [showDeleteIngredientModal, setShowDeleteIngredientModal] = useState(false);
  const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null);

  // Product info
  const [productIngredients, setProductIngredients] = useState<Ingredient[]>([]);
  const [loadingProductIngredients, setLoadingProductIngredients] = useState(false);

  const [saving, setSaving] = useState(false);
  const [importingIngredients, setImportingIngredients] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUser();
    fetchArticle();
  }, [articleId]);

  useEffect(() => {
    if (article) {
      fetchIngredients();
      if (article.productId) {
        fetchProductIngredients();
      }
    }
  }, [article]);

  useEffect(() => {
    if (productId && productId !== article?.productId) {
      fetchProductIngredients();
    }
  }, [productId]);

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
      setLoading(true);
      setError('');
      const res = await fetch(`/api/articles/${articleId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar el artículo');
        return;
      }

      const articleData = data.article as Article;
      setArticle(articleData);
      setName(articleData.name);
      setDescription(articleData.description || '');
      setProductId(articleData.productId);
      setBrand(articleData.brand);
      setVariant(articleData.variant || '');
      setWeightInGrams(articleData.weightInGrams?.toString() || '');
      setSuggestedPrice(articleData.suggestedPrice?.toString() || '');
      setIsGeneral(articleData.isGeneral);
      setIngredients(articleData.ingredients || []);
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching article:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    setLoadingIngredients(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/ingredients`);
      const data = await res.json();
      if (res.ok && data.ingredients) {
        setIngredients(data.ingredients);
      }
    } catch (err) {
      console.error('Error fetching ingredients:', err);
    } finally {
      setLoadingIngredients(false);
    }
  };


  const fetchProductIngredients = async () => {
    if (!productId) return;
    setLoadingProductIngredients(true);
    try {
      const res = await fetch(`/api/products/${productId}/ingredients`);
      const data = await res.json();
      if (res.ok && data.ingredients) {
        setProductIngredients(data.ingredients);
      }
    } catch (err) {
      console.error('Error fetching product ingredients:', err);
      setProductIngredients([]);
    } finally {
      setLoadingProductIngredients(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors({ name: 'El nombre es requerido' });
      return;
    }

    if (!productId) {
      setFieldErrors({ productId: 'El producto es requerido' });
      return;
    }

    if (!brand.trim()) {
      setFieldErrors({ brand: 'La marca es requerida' });
      return;
    }

    setSaving(true);

    try {
      const body: any = {
        name: name.trim(),
        description: description.trim() || null,
        productId,
        brand: brand.trim(),
        variant: variant.trim() || null,
        weightInGrams: weightInGrams ? parseFloat(weightInGrams) : null,
        suggestedPrice: suggestedPrice ? parseFloat(suggestedPrice) : null,
        isGeneral,
      };

      const res = await fetch(`/api/articles/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          const zodErrors: Record<string, string> = {};
          data.details.forEach((err: any) => {
            if (err.path) {
              zodErrors[err.path[0]] = err.message;
            }
          });
          setFieldErrors(zodErrors);
        } else {
          setError(data.error || 'Error al actualizar artículo');
        }
        setSaving(false);
        return;
      }

      showToast('success', 'Artículo actualizado correctamente');
      router.push(`/app/articles/${articleId}`);
    } catch (err) {
      setError('Error de conexión');
      console.error('Error updating article:', err);
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddIngredient = async (ingredientId: string) => {
    try {
      const res = await fetch(`/api/articles/${articleId}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientIds: [ingredientId],
          isOptional: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Error al añadir ingrediente');
        return;
      }

      showToast('success', 'Ingrediente añadido correctamente');
      fetchIngredients();
    } catch (err) {
      showToast('error', 'Error de conexión');
    }
  };

  const handleCreateIngredient = async (ingredientName: string): Promise<void> => {
    try {
      // Crear el ingrediente
      const createRes = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingredientName.trim(),
          type: 'generic', // Tipo por defecto para creación rápida
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        showToast('error', createData.error || 'Error al crear ingrediente');
        throw new Error(createData.error || 'Error al crear ingrediente');
      }

      // Añadir el ingrediente recién creado al artículo
      await handleAddIngredient(createData.ingredient.id);
      showToast('success', `Ingrediente "${ingredientName}" creado y añadido correctamente`);
    } catch (err) {
      console.error('Error creating ingredient:', err);
      throw err;
    }
  };

  const handleDeleteIngredientClick = (ingredient: Ingredient) => {
    setDeletingIngredient(ingredient);
    setShowDeleteIngredientModal(true);
  };

  const handleDeleteIngredientConfirm = async () => {
    if (!deletingIngredient) return;

    try {
      const res = await fetch(
        `/api/articles/${articleId}/ingredients/${deletingIngredient.id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Error al eliminar ingrediente');
        return;
      }

      showToast('success', 'Ingrediente eliminado correctamente');
      setShowDeleteIngredientModal(false);
      setDeletingIngredient(null);
      fetchIngredients();
    } catch (err) {
      showToast('error', 'Error de conexión');
    }
  };

  const handleToggleIngredientOptional = async (ingredient: Ingredient) => {
    try {
      const res = await fetch(
        `/api/articles/${articleId}/ingredients/${ingredient.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isOptional: !ingredient.isOptional,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Error al actualizar ingrediente');
        return;
      }

      fetchIngredients();
    } catch (err) {
      showToast('error', 'Error de conexión');
    }
  };

  const handleImportFromProduct = async () => {
    if (!productId) {
      showToast('error', 'No hay producto asociado');
      return;
    }

    setImportingIngredients(true);
    try {
      const res = await fetch(
        `/api/articles/${articleId}/ingredients/import-from-product`,
        {
          method: 'POST',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Error al importar ingredientes');
        setImportingIngredients(false);
        return;
      }

      showToast('success', `Se importaron ${data.importedCount || 0} ingredientes correctamente`);
      fetchIngredients();
    } catch (err) {
      showToast('error', 'Error de conexión');
    } finally {
      setImportingIngredients(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Cargando artículo...</div>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
          <Link
            href="/app/articles"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Volver a artículos
          </Link>
        </div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  const canEdit = article.isGeneral || currentUser?.id === article.createdById;

  if (!canEdit) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">No tienes permiso para editar este artículo</p>
          <Link
            href={`/app/articles/${articleId}`}
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Volver al artículo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/app/articles/${articleId}`}
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          ← Volver al artículo
        </Link>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Editar Artículo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Modifica la información del artículo y gestiona sus ingredientes
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del Artículo */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Información del Artículo
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre <span className="text-red-500">*</span>
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
                className={`block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 ${
                  fieldErrors.name
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Ej: Tortillas de maíz Hacendado"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Descripción
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Descripción opcional del artículo..."
              />
            </div>

            <div>
              <label
                htmlFor="productId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Producto Asociado <span className="text-red-500">*</span>
              </label>
              <SearchableProductSelect
                value={productId}
                onChange={(value) => {
                  setProductId(value);
                  if (fieldErrors.productId) {
                    setFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.productId;
                      return newErrors;
                    });
                  }
                }}
                placeholder="Buscar producto... (mínimo 3 caracteres)"
                error={fieldErrors.productId}
                initialProductName={article?.product?.name}
              />
              {fieldErrors.productId && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.productId}</p>
              )}
              {productId && (
                <Link
                  href={`/app/products/${productId}`}
                  className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                >
                  Ver detalles del producto →
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="brand"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Marca <span className="text-red-500">*</span>
                </label>
                <input
                  id="brand"
                  type="text"
                  required
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    if (fieldErrors.brand) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.brand;
                        return newErrors;
                      });
                    }
                  }}
                  className={`block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 ${
                    fieldErrors.brand
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Ej: Hacendado"
                />
                {fieldErrors.brand && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.brand}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="variant"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Variante
                </label>
                <input
                  id="variant"
                  type="text"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Ej: de maíz, 5L"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="weightInGrams"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Peso (gramos)
                </label>
                <input
                  id="weightInGrams"
                  type="number"
                  step="0.01"
                  min="0"
                  value={weightInGrams}
                  onChange={(e) => setWeightInGrams(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="500"
                />
              </div>

              <div>
                <label
                  htmlFor="suggestedPrice"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Precio Sugerido (€)
                </label>
                <input
                  id="suggestedPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={suggestedPrice}
                  onChange={(e) => setSuggestedPrice(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="1.50"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="isGeneral"
                type="checkbox"
                checked={isGeneral}
                onChange={(e) => setIsGeneral(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isGeneral" className="ml-2 block text-sm text-gray-700">
                Artículo general (visible para todos los usuarios)
              </label>
            </div>
          </div>
        </div>

        {/* Gestión de Ingredientes */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Gestión de Ingredientes
            </h2>
            {productId && (
              <button
                type="button"
                onClick={handleImportFromProduct}
                disabled={importingIngredients}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {importingIngredients
                  ? 'Importando...'
                  : 'Importar desde Producto'}
              </button>
            )}
          </div>

          {/* Lista de ingredientes actuales */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Ingredientes del Artículo ({ingredients.length})
            </h3>
            {loadingIngredients ? (
              <div className="text-sm text-gray-500">Cargando ingredientes...</div>
            ) : ingredients.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay ingredientes asignados a este artículo.
              </p>
            ) : (
              <ul className="space-y-2">
                {ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={ingredient.isOptional}
                        onChange={() => handleToggleIngredientOptional(ingredient)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {ingredient.name}
                        </span>
                        {ingredient.isOptional && (
                          <span className="ml-2 text-xs text-gray-500">
                            (opcional)
                          </span>
                        )}
                        {ingredient.type && (
                          <span className="ml-2 text-xs text-gray-400">
                            [{ingredient.type}]
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteIngredientClick(ingredient)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Añadir nuevo ingrediente */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Buscar o Crear Ingrediente
            </h3>
            <IngredientSearchInput
              onSelectIngredient={handleAddIngredient}
              onCreateIngredient={handleCreateIngredient}
              excludeIngredientIds={ingredients.map((ing) => ing.id)}
              placeholder="Escribe el nombre del ingrediente (mínimo 2 caracteres)..."
            />
            <p className="mt-2 text-xs text-gray-500">
              Escribe para buscar ingredientes existentes o crear uno nuevo. Presiona Enter para crear rápidamente.
            </p>
          </div>
        </div>

        {/* Información del Producto */}
        {productId && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información del Producto
            </h2>
            {article.product && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Nombre</p>
                  <p className="text-base text-gray-900">{article.product.name}</p>
                </div>
                {article.product.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Descripción</p>
                    <p className="text-base text-gray-900">
                      {article.product.description}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    Ingredientes del Producto ({productIngredients.length})
                  </p>
                  {loadingProductIngredients ? (
                    <div className="text-sm text-gray-500">
                      Cargando ingredientes del producto...
                    </div>
                  ) : productIngredients.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      El producto no tiene ingredientes asignados.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {productIngredients.map((ing) => (
                        <li key={ing.id} className="text-sm text-gray-900">
                          • {ing.name}
                          {ing.isOptional && (
                            <span className="ml-2 text-xs text-gray-500">
                              (opcional)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href={`/app/articles/${articleId}`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      {/* Modal de confirmación para eliminar ingrediente */}
      <ConfirmDeleteModal
        isOpen={showDeleteIngredientModal}
        onClose={() => {
          setShowDeleteIngredientModal(false);
          setDeletingIngredient(null);
        }}
        onConfirm={handleDeleteIngredientConfirm}
        title="Eliminar Ingrediente"
        message={`¿Estás seguro de que quieres eliminar el ingrediente "${deletingIngredient?.name}" de este artículo?`}
        itemName={deletingIngredient?.name || ''}
      />
    </div>
  );
}

