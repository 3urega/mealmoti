'use client';

import { useEffect, useState } from 'react';

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
  } | null;
}

interface IngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient?: Ingredient | null;
  onSuccess: () => void;
}

export default function IngredientModal({
  isOpen,
  onClose,
  ingredient,
  onSuccess,
}: IngredientModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'chemical' | 'generic' | 'product'>('generic');
  const [description, setDescription] = useState('');
  const [allergenInfo, setAllergenInfo] = useState('');
  const [productId, setProductId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (ingredient) {
        // Modo edición
        setName(ingredient.name);
        setType(ingredient.type);
        setDescription(ingredient.description || '');
        setAllergenInfo(ingredient.allergenInfo || '');
        setProductId(ingredient.productId || '');
      } else {
        // Modo creación
        setName('');
        setType('generic');
        setDescription('');
        setAllergenInfo('');
        setProductId('');
      }
      setError('');
      setFieldErrors({});
    }
  }, [isOpen, ingredient]);

  useEffect(() => {
    if (isOpen && type === 'product') {
      fetchProducts();
    } else {
      setProducts([]);
    }
  }, [isOpen, type]);

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
      const url = ingredient
        ? `/api/ingredients/${ingredient.id}`
        : '/api/ingredients';
      const method = ingredient ? 'PUT' : 'POST';

      const body: any = {
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        allergenInfo: allergenInfo.trim() || undefined,
      };

      if (type === 'product') {
        body.productId = productId || null;
      }
      // Si no es tipo product, no incluimos productId (será undefined/null en el schema)

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
          setError(data.error || 'Error al guardar ingrediente');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {ingredient ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
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
              placeholder="Ej: E-355, Azúcar, Harina de maíz"
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
              Tipo *
            </label>
            <select
              id="type"
              required
              value={type}
              onChange={handleTypeChange}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="generic">Generic</option>
              <option value="chemical">Chemical</option>
              <option value="product">Product</option>
            </select>
          </div>

          {type === 'product' && (
            <div>
              <label
                htmlFor="productId"
                className="block text-sm font-medium text-gray-700"
              >
                Producto Asociado *
              </label>
              {loadingProducts ? (
                <div className="mt-1 text-sm text-gray-500">Cargando productos...</div>
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
                  className={`mt-1 block w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-blue-500 ${
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Descripción opcional del ingrediente..."
            />
          </div>

          <div>
            <label
              htmlFor="allergenInfo"
              className="block text-sm font-medium text-gray-700"
            >
              Información de Alergias
            </label>
            <textarea
              id="allergenInfo"
              value={allergenInfo}
              onChange={(e) => setAllergenInfo(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Información sobre alergias (opcional)..."
            />
          </div>

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
              {saving ? 'Guardando...' : ingredient ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

