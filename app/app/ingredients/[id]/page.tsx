'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotification } from '@/contexts/NotificationContext';

interface Product {
  id: string;
  name: string;
}

interface Ingredient {
  id: string;
  name: string;
  type: 'chemical' | 'generic' | 'product';
  description?: string | null;
  allergenInfo?: string | null;
  productId?: string | null;
  product?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export default function IngredientEditPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useNotification();
  const ingredientId = params.id as string;

  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState<'chemical' | 'generic' | 'product'>('generic');
  const [description, setDescription] = useState('');
  const [allergenInfo, setAllergenInfo] = useState('');
  const [productId, setProductId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchIngredient();
  }, [ingredientId]);

  useEffect(() => {
    if (type === 'product') {
      fetchProducts();
    } else {
      setProducts([]);
    }
  }, [type]);

  const fetchIngredient = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/ingredients/${ingredientId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar el ingrediente');
        return;
      }

      const ingredientData = data.ingredient as Ingredient;
      setIngredient(ingredientData);
      setName(ingredientData.name);
      setType(ingredientData.type);
      setDescription(ingredientData.description || '');
      setAllergenInfo(ingredientData.allergenInfo || '');
      setProductId(ingredientData.productId || '');
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching ingredient:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      if (res.ok && data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'El nombre es requerido';
    }

    if (type === 'product' && !productId) {
      errors.productId = 'El producto es requerido cuando el tipo es "product"';
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
        description: description.trim() || undefined,
        allergenInfo: allergenInfo.trim() || undefined,
      };

      if (type === 'product') {
        body.productId = productId || null;
      } else {
        body.productId = null;
      }

      const res = await fetch(`/api/ingredients/${ingredientId}`, {
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
          setError(data.error || 'Error al actualizar ingrediente');
        }
        return;
      }

      showToast('success', 'Ingrediente actualizado correctamente');
      router.push('/app/ingredients');
    } catch (err) {
      setError('Error de conexión');
      console.error('Error updating ingredient:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'chemical' | 'generic' | 'product';
    setType(newType);
    if (newType !== 'product') {
      setProductId('');
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.productId;
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Cargando ingrediente...</div>
      </div>
    );
  }

  if (error || !ingredient) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error || 'Ingrediente no encontrado'}</p>
          <Link
            href="/app/ingredients"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Volver a ingredientes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/app/ingredients"
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          ← Volver a ingredientes
        </Link>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Editar Ingrediente</h1>
          <p className="mt-2 text-sm text-gray-600">
            Modifica la información del ingrediente
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Nombre */}
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
              placeholder="Ej: E-355, Azúcar, Harina de maíz"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              required
              value={type}
              onChange={handleTypeChange}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="generic">Generic</option>
              <option value="chemical">Chemical</option>
              <option value="product">Product</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Generic: Ingrediente genérico | Chemical: Elemento químico o aditivo | Product: Referencia a un producto
            </p>
          </div>

          {/* Producto Asociado (solo si type es product) */}
          {type === 'product' && (
            <div>
              <label
                htmlFor="productId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Producto Asociado <span className="text-red-500">*</span>
              </label>
              {loadingProducts ? (
                <div className="text-sm text-gray-500">Cargando productos...</div>
              ) : (
                <select
                  id="productId"
                  required={type === 'product'}
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
                  className={`block w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-blue-500 ${
                    fieldErrors.productId
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                >
                  <option value="">Selecciona un producto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              )}
              {fieldErrors.productId && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.productId}</p>
              )}
            </div>
          )}

          {/* Descripción */}
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
              rows={4}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Descripción opcional del ingrediente..."
            />
          </div>

          {/* Información de Alergias */}
          <div>
            <label
              htmlFor="allergenInfo"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Información de Alergias
            </label>
            <textarea
              id="allergenInfo"
              value={allergenInfo}
              onChange={(e) => setAllergenInfo(e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Información sobre alergias (opcional)..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Ej: Contiene gluten, Contiene lactosa, Contiene proteínas de huevo
            </p>
          </div>

          {/* Información adicional */}
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Creado:</span>{' '}
                {new Date(ingredient.createdAt).toLocaleDateString('es-ES')}
              </div>
              <div>
                <span className="font-medium">Última actualización:</span>{' '}
                {new Date(ingredient.updatedAt).toLocaleDateString('es-ES')}
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Link
              href="/app/ingredients"
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
      </div>
    </div>
  );
}

