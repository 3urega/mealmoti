'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
}

interface RecipeIngredient {
  productId: string;
  quantity: string;
  unit: string;
  isOptional: boolean;
  notes: string;
  order: number;
}

export default function NewRecipePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [servings, setServings] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products?limit=200');
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

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        productId: '',
        quantity: '',
        unit: 'unidades',
        isOptional: false,
        notes: '',
        order: ingredients.length,
      },
    ]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (
    index: number,
    field: keyof RecipeIngredient,
    value: any
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    // Validar que todos los ingredientes tienen producto y cantidad
    const invalidIngredients = ingredients.filter(
      (ing) => !ing.productId || !ing.quantity
    );

    if (invalidIngredients.length > 0) {
      setError('Todos los ingredientes deben tener producto y cantidad');
      setCreating(false);
      return;
    }

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          instructions: instructions || undefined,
          servings: servings ? parseInt(servings) : undefined,
          prepTime: prepTime ? parseInt(prepTime) : undefined,
          cookTime: cookTime ? parseInt(cookTime) : undefined,
          isGeneral: false,
          ingredients: ingredients.map((ing) => ({
            productId: ing.productId,
            quantity: parseFloat(ing.quantity),
            unit: ing.unit,
            isOptional: ing.isOptional,
            notes: ing.notes || undefined,
            order: ing.order,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al crear la receta');
        setCreating(false);
        return;
      }

      router.push(`/app/recipes/${data.recipe.id}`);
    } catch (err) {
      setError('Error de conexión');
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Receta</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Información General
          </h2>

          <div className="space-y-4">
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
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Ej: Paella marinera"
              />
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
                rows={2}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Descripción opcional..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label
                  htmlFor="servings"
                  className="block text-sm font-medium text-gray-700"
                >
                  Porciones
                </label>
                <input
                  id="servings"
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="4"
                />
              </div>

              <div>
                <label
                  htmlFor="prepTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tiempo preparación (min)
                </label>
                <input
                  id="prepTime"
                  type="number"
                  min="1"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="30"
                />
              </div>

              <div>
                <label
                  htmlFor="cookTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tiempo cocción (min)
                </label>
                <input
                  id="cookTime"
                  type="number"
                  min="1"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="45"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="instructions"
                className="block text-sm font-medium text-gray-700"
              >
                Instrucciones
              </label>
              <textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Instrucciones de preparación..."
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Ingredientes *
            </h2>
            <button
              type="button"
              onClick={addIngredient}
              className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              + Agregar Ingrediente
            </button>
          </div>

          {ingredients.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay ingredientes. Agrega al menos uno.
            </p>
          ) : (
            <div className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="rounded-md border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-gray-700">
                        Producto *
                      </label>
                      <select
                        required
                        value={ingredient.productId}
                        onChange={(e) =>
                          updateIngredient(index, 'productId', e.target.value)
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      >
                        <option value="">Seleccionar producto...</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={ingredient.quantity}
                        onChange={(e) =>
                          updateIngredient(index, 'quantity', e.target.value)
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        placeholder="500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Unidad *
                      </label>
                      <input
                        type="text"
                        required
                        value={ingredient.unit}
                        onChange={(e) =>
                          updateIngredient(index, 'unit', e.target.value)
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        placeholder="gr, ml, unidades..."
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700">
                        Notas
                      </label>
                      <input
                        type="text"
                        value={ingredient.notes}
                        onChange={(e) =>
                          updateIngredient(index, 'notes', e.target.value)
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        placeholder="Notas opcionales..."
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`optional-${index}`}
                          checked={ingredient.isOptional}
                          onChange={(e) =>
                            updateIngredient(
                              index,
                              'isOptional',
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`optional-${index}`}
                          className="text-xs text-gray-700"
                        >
                          Opcional
                        </label>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={creating || ingredients.length === 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear Receta'}
          </button>
        </div>
      </form>
    </div>
  );
}

