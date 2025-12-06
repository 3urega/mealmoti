'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface RecipeIngredient {
  id: string;
  product: {
    id: string;
    name: string;
  };
  quantity: number;
  unit: string;
  isOptional: boolean;
  notes?: string | null;
}

interface Recipe {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  servings?: number | null;
  prepTime?: number | null;
  cookTime?: number | null;
  ingredients: RecipeIngredient[];
  createdBy: {
    id: string;
    name: string;
  };
}

interface Article {
  id: string;
  name: string;
  brand: string;
  suggestedPrice?: number | null;
  stores: Array<{
    id: string;
    name: string;
    price?: number | null;
  }>;
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as string;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [ingredientSelections, setIngredientSelections] = useState<
    Record<string, { articleId: string; quantity?: number; unit?: string }>
  >({});
  const [articlesByIngredient, setArticlesByIngredient] = useState<
    Record<string, Article[]>
  >({});
  const [loadingArticles, setLoadingArticles] = useState<
    Record<string, boolean>
  >({});
  const [listName, setListName] = useState('');
  const [servings, setServings] = useState('');
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [recipeId]);

  const fetchRecipe = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/recipes/${recipeId}`);
      const data = await res.json();
      if (res.ok) {
        setRecipe(data.recipe);
        setListName(`Lista: ${data.recipe.name}`);
        setServings(data.recipe.servings?.toString() || '');
      } else {
        setError(data.error || 'Error al cargar la receta');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchArticlesForIngredient = async (ingredientId: string) => {
    setLoadingArticles((prev) => ({ ...prev, [ingredientId]: true }));
    try {
      const res = await fetch(
        `/api/recipes/${recipeId}/ingredients/${ingredientId}/articles`
      );
      const data = await res.json();
      if (res.ok) {
        setArticlesByIngredient((prev) => ({
          ...prev,
          [ingredientId]: data.articles || [],
        }));
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
    } finally {
      setLoadingArticles((prev) => ({ ...prev, [ingredientId]: false }));
    }
  };

  const handleConvertToList = async () => {
    if (!recipe) return;

    // Validar que todos los ingredientes tienen artículo seleccionado
    const missingSelections = recipe.ingredients.filter(
      (ing) => !ingredientSelections[ing.id]?.articleId
    );

    if (missingSelections.length > 0) {
      setError(
        `Debes seleccionar artículos para: ${missingSelections.map((ing) => ing.product.name).join(', ')}`
      );
      return;
    }

    setConverting(true);
    setError('');

    try {
      const res = await fetch(
        `/api/lists?fromRecipe=${recipeId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: listName || `Lista: ${recipe.name}`,
            description: `Lista generada desde receta: ${recipe.name}`,
            servings: servings ? parseInt(servings) : recipe.servings,
            ingredientSelections,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al crear la lista');
        setConverting(false);
        return;
      }

      router.push(`/app/lists/${data.list.id}`);
    } catch (err) {
      setError('Error de conexión');
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (error && !recipe) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {error}
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{recipe.name}</h1>
          {recipe.description && (
            <p className="mt-2 text-gray-600">{recipe.description}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            {recipe.servings && (
              <span>Porciones: {recipe.servings}</span>
            )}
            {recipe.prepTime && (
              <span>Preparación: {recipe.prepTime} min</span>
            )}
            {recipe.cookTime && (
              <span>Cocción: {recipe.cookTime} min</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowConvertModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Crear Lista desde Receta
        </button>
      </div>

      {recipe.instructions && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Instrucciones
          </h2>
          <p className="whitespace-pre-line text-gray-700">
            {recipe.instructions}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Ingredientes ({recipe.ingredients.length})
        </h2>
        <ul className="space-y-3">
          {recipe.ingredients.map((ingredient) => (
            <li
              key={ingredient.id}
              className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex-1">
                <span className="font-medium text-gray-900">
                  {ingredient.product.name}
                </span>
                <span className="ml-2 text-gray-600">
                  {ingredient.quantity} {ingredient.unit}
                </span>
                {ingredient.isOptional && (
                  <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                    Opcional
                  </span>
                )}
                {ingredient.notes && (
                  <p className="mt-1 text-sm text-gray-500">
                    {ingredient.notes}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Crear Lista desde Receta
            </h2>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Nombre de la lista *
              </label>
              <input
                type="text"
                required
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Porciones
              </label>
              <input
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder={recipe.servings?.toString() || '4'}
              />
            </div>

            <div className="mb-6 max-h-96 space-y-4 overflow-y-auto">
              <h3 className="font-semibold text-gray-900">
                Selecciona artículos para cada ingrediente:
              </h3>
              {recipe.ingredients.map((ingredient) => {
                const articles = articlesByIngredient[ingredient.id] || [];
                const selection = ingredientSelections[ingredient.id];

                return (
                  <div
                    key={ingredient.id}
                    className="rounded-md border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-2">
                      <span className="font-medium text-gray-900">
                        {ingredient.product.name}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    </div>

                    {articles.length === 0 && !loadingArticles[ingredient.id] && (
                      <button
                        type="button"
                        onClick={() => fetchArticlesForIngredient(ingredient.id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Cargar artículos disponibles
                      </button>
                    )}

                    {loadingArticles[ingredient.id] && (
                      <p className="text-sm text-gray-500">Cargando...</p>
                    )}

                    {articles.length > 0 && (
                      <select
                        required
                        value={selection?.articleId || ''}
                        onChange={(e) => {
                          setIngredientSelections((prev) => ({
                            ...prev,
                            [ingredient.id]: {
                              articleId: e.target.value,
                              quantity: ingredient.quantity,
                              unit: ingredient.unit,
                            },
                          }));
                        }}
                        className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      >
                        <option value="">Seleccionar artículo...</option>
                        {articles.map((article) => (
                          <option key={article.id} value={article.id}>
                            {article.name} ({article.brand})
                            {article.suggestedPrice &&
                              ` - €${article.suggestedPrice.toFixed(2)}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowConvertModal(false);
                  setError('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConvertToList}
                disabled={converting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {converting ? 'Creando...' : 'Crear Lista'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

