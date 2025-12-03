'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  isGeneral: boolean;
}

interface Ingredient {
  id: string;
  name: string;
  type: string;
}

interface Article {
  id: string;
  name: string;
  product: { id: string; name: string };
  brand: string;
  variant?: string | null;
  suggestedPrice?: number | null;
  isGeneral: boolean;
  createdById?: string | null;
  storesCount: number;
}

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article?: Article | null;
  onSuccess: () => void;
}

export default function ArticleModal({
  isOpen,
  onClose,
  article,
  onSuccess,
}: ArticleModalProps) {
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [brand, setBrand] = useState('genérico');
  const [variant, setVariant] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [isGeneral, setIsGeneral] = useState(false);
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingIngredients, setLoadingIngredients] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchIngredients();
      if (article) {
        // Modo edición
        setName(article.name);
        setProductId(article.product.id);
        setBrand(article.brand);
        setVariant(article.variant || '');
        setSuggestedPrice(article.suggestedPrice?.toString() || '');
        setIsGeneral(article.isGeneral);
        // Nota: Los ingredientes se cargarían desde GET /api/articles/[id]/ingredients
        // Por ahora los dejamos vacíos en edición
        setIngredientIds([]);
      } else {
        // Modo creación
        setName('');
        setProductId('');
        setBrand('genérico');
        setVariant('');
        setSuggestedPrice('');
        setIsGeneral(false);
        setIngredientIds([]);
      }
      setError('');
      setFieldErrors({});
    }
  }, [isOpen, article]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products?limit=1000');
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchIngredients = async () => {
    setLoadingIngredients(true);
    try {
      const res = await fetch('/api/ingredients?limit=1000');
      const data = await res.json();
      if (res.ok) {
        setIngredients(data.ingredients || []);
      }
    } catch (err) {
      console.error('Error fetching ingredients:', err);
    } finally {
      setLoadingIngredients(false);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'El nombre es requerido';
    }
    if (!productId) {
      errors.productId = 'El producto es requerido';
    }
    if (!brand.trim()) {
      errors.brand = 'La marca es requerida';
    }
    if (suggestedPrice && parseFloat(suggestedPrice) <= 0) {
      errors.suggestedPrice = 'El precio debe ser positivo';
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
      const url = article
        ? `/api/articles/${article.id}`
        : '/api/articles';
      const method = article ? 'PUT' : 'POST';

      const body: any = {
        name: name.trim(),
        productId,
        brand: brand.trim() || 'genérico',
        variant: variant.trim() || undefined,
        suggestedPrice: suggestedPrice
          ? parseFloat(suggestedPrice)
          : undefined,
        isGeneral,
      };

      // Solo incluir ingredientIds en POST (creación)
      if (!article && ingredientIds.length > 0) {
        body.ingredientIds = ingredientIds;
      }

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
          setError(data.error || 'Error al guardar artículo');
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

  const handleIngredientToggle = (ingredientId: string) => {
    setIngredientIds((prev) =>
      prev.includes(ingredientId)
        ? prev.filter((id) => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {article ? 'Editar Artículo' : 'Nuevo Artículo'}
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
              placeholder="Ej: Tortillas de maíz Hacendado"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="productId"
              className="block text-sm font-medium text-gray-700"
            >
              Producto *
            </label>
            {loadingProducts ? (
              <div className="mt-1 text-sm text-gray-500">
                Cargando productos...
              </div>
            ) : (
              <select
                id="productId"
                required
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  if (fieldErrors.productId) {
                    setFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.productId;
                      return newErrors;
                    });
                  }
                }}
                disabled={!!article}
                className={`mt-1 block w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-blue-500 ${
                  fieldErrors.productId
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                } ${article ? 'bg-gray-100' : ''}`}
              >
                <option value="">Selecciona un producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.isGeneral ? 'General' : 'Particular'})
                  </option>
                ))}
              </select>
            )}
            {fieldErrors.productId && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.productId}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="brand"
                className="block text-sm font-medium text-gray-700"
              >
                Marca *
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
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 ${
                  fieldErrors.brand
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Ej: Hacendado"
              />
              {fieldErrors.brand && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.brand}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="variant"
                className="block text-sm font-medium text-gray-700"
              >
                Variante
              </label>
              <input
                id="variant"
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Ej: de maíz, 5L"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="suggestedPrice"
              className="block text-sm font-medium text-gray-700"
            >
              Precio Sugerido (€)
            </label>
            <input
              id="suggestedPrice"
              type="number"
              step="0.01"
              min="0"
              value={suggestedPrice}
              onChange={(e) => {
                setSuggestedPrice(e.target.value);
                if (fieldErrors.suggestedPrice) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.suggestedPrice;
                    return newErrors;
                  });
                }
              }}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 ${
                fieldErrors.suggestedPrice
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="1.50"
            />
            {fieldErrors.suggestedPrice && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.suggestedPrice}
              </p>
            )}
          </div>

          {!article && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ingredientes (opcional)
              </label>
              {loadingIngredients ? (
                <div className="mt-1 text-sm text-gray-500">
                  Cargando ingredientes...
                </div>
              ) : (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-300 p-2">
                  {ingredients.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No hay ingredientes disponibles
                    </p>
                  ) : (
                    ingredients.map((ingredient) => (
                      <label
                        key={ingredient.id}
                        className="flex items-center space-x-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={ingredientIds.includes(ingredient.id)}
                          onChange={() => handleIngredientToggle(ingredient.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {ingredient.name} ({ingredient.type})
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

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
              Artículo general (visible para todos los usuarios)
            </label>
          </div>

          {isGeneral && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">
                Los artículos generales son visibles para todos los usuarios del
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
              {saving ? 'Guardando...' : article ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

