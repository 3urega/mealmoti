'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SearchableSelect from '@/components/SearchableSelect';
import { useNotification } from '@/contexts/NotificationContext';

interface RecipeIngredient {
  id: string;
  product: {
    id: string;
    name: string;
  };
  quantity: number;
  unitId?: string | null;
  unit?: {
    id: string;
    name: string;
    symbol: string;
  } | null;
  isOptional: boolean;
  notes?: string | null;
  article?: {
    id: string;
    name: string;
    brand: string;
    variant?: string | null;
    suggestedPrice?: number | null;
  } | null;
  articleId?: string | null;
}

interface Recipe {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  servings?: number | null;
  prepTime?: number | null;
  cookTime?: number | null;
  isGeneral: boolean;
  originalRecipeId?: string | null;
  originalRecipe?: {
    id: string;
    name: string;
  } | null;
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
  const { showToast, showConfirm } = useNotification();
  const recipeId = params.id as string;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [ingredientSelections, setIngredientSelections] = useState<
    Record<string, { articleId: string; quantity?: number; unitId?: string }>
  >({});
  const [units, setUnits] = useState<Array<{ id: string; name: string; symbol: string }>>([]);
  const [articlesByIngredient, setArticlesByIngredient] = useState<
    Record<string, Article[]>
  >({});
  const [loadingArticles, setLoadingArticles] = useState<
    Record<string, boolean>
  >({});
  const [listName, setListName] = useState('');
  const [servings, setServings] = useState('');
  const [converting, setConverting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [availableLists, setAvailableLists] = useState<Array<{
    id: string;
    name: string;
    ownerId: string;
    status: string;
  }>>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [addingToList, setAddingToList] = useState(false);
  const [addToListServings, setAddToListServings] = useState('');
  const [addToListStep, setAddToListStep] = useState<'select-list' | 'select-articles'>('select-list');
  const [addToListSelections, setAddToListSelections] = useState<Record<string, { articleId: string; quantity?: number; unitId?: string }>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editServings, setEditServings] = useState('');
  const [editPrepTime, setEditPrepTime] = useState('');
  const [editCookTime, setEditCookTime] = useState('');

  useEffect(() => {
    fetchUser();
    fetchRecipe();
    fetchUnits();
  }, [recipeId]);

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      const data = await res.json();
      if (res.ok && data.units) {
        setUnits(data.units);
      }
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  useEffect(() => {
    if (showAddToListModal) {
      fetchAvailableLists();
      setAddToListStep('select-list');
      setAddToListSelections({});
      // Pre-seleccionar artículos asociados si existen
      if (recipe) {
        const preselections: Record<string, { articleId: string; quantity?: number; unitId?: string }> = {};
        recipe.ingredients.forEach((ing) => {
          if (ing.articleId) {
            preselections[ing.id] = {
              articleId: ing.articleId,
              quantity: ing.quantity,
              unitId: ing.unitId || undefined,
            };
          }
        });
        setAddToListSelections(preselections);
      }
    }
  }, [showAddToListModal, recipe]);

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


  const handleOpenEditModal = () => {
    if (!recipe) return;
    setEditName(recipe.name);
    setEditDescription(recipe.description || '');
    setEditInstructions(recipe.instructions || '');
    setEditServings(recipe.servings?.toString() || '');
    setEditPrepTime(recipe.prepTime?.toString() || '');
    setEditCookTime(recipe.cookTime?.toString() || '');
    setShowEditModal(true);
  };

  const handleSaveRecipe = async () => {
    if (!recipe) return;

    setEditingRecipe(true);
    setError('');

    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription || undefined,
          instructions: editInstructions || undefined,
          servings: editServings ? parseInt(editServings) : undefined,
          prepTime: editPrepTime ? parseInt(editPrepTime) : undefined,
          cookTime: editCookTime ? parseInt(editCookTime) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al actualizar la receta');
        setEditingRecipe(false);
        return;
      }

      // Actualizar la receta localmente
      setRecipe(data.recipe);
      setShowEditModal(false);
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setEditingRecipe(false);
    }
  };

  const handleAddIngredient = async (productId: string, quantity: number, unitId: string, isOptional: boolean, notes: string) => {
    if (!recipe) return;

    try {
      const res = await fetch(`/api/recipes/${recipeId}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity,
          unitId,
          isOptional,
          notes: notes || undefined,
          order: recipe.ingredients.length,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al agregar ingrediente');
        throw new Error(data.error || 'Error al agregar ingrediente');
      }

      // Recargar la receta
      await fetchRecipe();
    } catch (err) {
      setError('Error de conexión');
      throw err;
    }
  };

  const handleUpdateIngredient = async (ingredientId: string, productId: string, quantity: number, unitId: string, isOptional: boolean, notes: string) => {
    if (!recipe) return;

    try {
      const res = await fetch(`/api/recipes/${recipeId}/ingredients/${ingredientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity,
          unitId,
          isOptional,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al actualizar ingrediente');
        throw new Error(data.error || 'Error al actualizar ingrediente');
      }

      // Recargar la receta
      await fetchRecipe();
    } catch (err) {
      setError('Error de conexión');
      throw err;
    }
  };

  const handleDeleteIngredient = async (ingredientId: string) => {
    if (!recipe) return;

    const confirmed = await showConfirm(
      'Eliminar ingrediente',
      '¿Estás seguro de que quieres eliminar este ingrediente?',
      {
        variant: 'danger',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      }
    );

    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/recipes/${recipeId}/ingredients/${ingredientId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al eliminar ingrediente');
        return;
      }

      // Recargar la receta
      fetchRecipe();
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const fetchAvailableLists = async () => {
    try {
      const res = await fetch('/api/lists');
      const data = await res.json();
      if (res.ok && data.lists) {
        // Filtrar solo listas donde el usuario puede editar (propias o compartidas con canEdit)
        const editableLists = data.lists.filter((list: any) => {
          const isOwner = list.ownerId === user?.id;
          const share = list.shares?.find((s: any) => s.user.id === user?.id);
          return isOwner || (share && share.canEdit);
        });
        setAvailableLists(editableLists);
      }
    } catch (err) {
      console.error('Error fetching lists:', err);
    }
  };

  const handleAddToListNext = () => {
    if (!selectedListId) {
      setError('Por favor selecciona una lista');
      return;
    }
    setError('');
    setAddToListStep('select-articles');
    // Cargar artículos para todos los ingredientes
    recipe?.ingredients.forEach((ingredient) => {
      if (!articlesByIngredient[ingredient.id] && !loadingArticles[ingredient.id]) {
        fetchArticlesForIngredient(ingredient.id);
      }
    });
  };

  const handleAddToList = async () => {
    if (!recipe || !selectedListId) return;

    // Verificar que al menos un ingrediente tiene artículo seleccionado
    const hasSelections = Object.values(addToListSelections).some(sel => sel.articleId);
    const hasPreselected = recipe.ingredients.some(ing => ing.articleId);
    
    if (!hasSelections && !hasPreselected) {
      setError('Debes seleccionar al menos un artículo para los ingredientes.');
      return;
    }

    setAddingToList(true);
    setError('');

    try {
      const res = await fetch(`/api/lists/${selectedListId}/items/from-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: recipe.id,
          servings: addToListServings ? parseInt(addToListServings) : recipe.servings,
          ingredientSelections: Object.keys(addToListSelections).length > 0 ? addToListSelections : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al añadir a la lista');
        setAddingToList(false);
        return;
      }

      // Mostrar mensaje de éxito y cerrar modal
      showToast(
        'success',
        `${data.message}\nAñadidos: ${data.added}\nOmitidos (ya existían): ${data.skipped}`
      );
      setShowAddToListModal(false);
      setSelectedListId('');
      setAddToListServings('');
      setAddToListStep('select-list');
      setAddToListSelections({});
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setAddingToList(false);
    }
  };

  const fetchRecipe = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/recipes/${recipeId}`);
      const data = await res.json();
      if (res.ok) {
        setRecipe(data.recipe);
        setListName(`Lista: ${data.recipe.name}`);
        setServings(data.recipe.servings?.toString() || '');
        
        // Auto-seleccionar artículos preseleccionados si existen
        const preselections: Record<string, { articleId: string; quantity?: number; unitId?: string }> = {};
        data.recipe.ingredients.forEach((ing: RecipeIngredient) => {
          if (ing.articleId) {
            preselections[ing.id] = {
              articleId: ing.articleId,
              quantity: ing.quantity,
              unitId: ing.unitId || undefined,
            };
          }
        });
        setIngredientSelections(preselections);
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

  const handleCopyRecipe = async () => {
    if (!recipe) return;

    setCopying(true);
    setError('');

    try {
      const res = await fetch(`/api/recipes/${recipeId}/copy`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al copiar la receta');
        setCopying(false);
        return;
      }

      // Redirigir a la receta copiada
      router.push(`/app/recipes/${data.recipe.id}`);
    } catch (err) {
      setError('Error de conexión');
      setCopying(false);
    }
  };

  const handleUpdateArticle = async (ingredientId: string, articleId: string | null) => {
    if (!recipe) return;

    try {
      const res = await fetch(
        `/api/recipes/${recipeId}/ingredients/${ingredientId}/article`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al actualizar el artículo');
        return;
      }

      // Actualizar la receta localmente
      setRecipe((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ingredients: prev.ingredients.map((ing) =>
            ing.id === ingredientId
              ? { ...ing, article: data.ingredient.article, articleId: data.ingredient.articleId }
              : ing
          ),
        };
      });

      setEditingIngredientId(null);
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const handleConvertToList = async () => {
    if (!recipe) return;

    // Validar que todos los ingredientes tienen artículo seleccionado (manual o preseleccionado)
    const missingSelections = recipe.ingredients.filter(
      (ing) => !ingredientSelections[ing.id]?.articleId && !ing.articleId
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
      {/* Header con título y badges */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-3xl font-bold text-gray-900">{recipe.name}</h1>
          {!recipe.isGeneral && user && recipe.createdBy.id === user.id && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
              Receta privada
            </span>
          )}
          {recipe.isGeneral && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
              Receta pública
            </span>
          )}
        </div>

        {/* Información del creador */}
        <div className="mb-4 text-sm text-gray-600">
          <span>Por {recipe.createdBy.name}</span>
          {recipe.originalRecipe && (
            <span className="ml-2 text-gray-500">
              • Basada en: {recipe.originalRecipe.name}
            </span>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-2 mb-6">
          {user && recipe.createdBy.id === user.id && (
            <button
              onClick={handleOpenEditModal}
              className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Editar Receta
            </button>
          )}
          {recipe.isGeneral && user && recipe.createdBy.id !== user.id && (
            <button
              onClick={handleCopyRecipe}
              disabled={copying}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {copying ? 'Copiando...' : 'Copiar a mi perfil'}
            </button>
          )}
          {!recipe.isGeneral && user && recipe.createdBy.id === user.id && (
            <button
              onClick={() => setShowAddToListModal(true)}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Añadir a Lista
            </button>
          )}
          <button
            onClick={() => setShowConvertModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Crear Lista desde Receta
          </button>
        </div>
      </div>

      {/* Información principal de la receta */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Descripción */}
        {recipe.description && (
          <div className="md:col-span-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Descripción
            </h2>
            <p className="text-gray-700 whitespace-pre-line">
              {recipe.description}
            </p>
          </div>
        )}

        {/* Información de porciones y tiempos */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Información
          </h3>
          <div className="space-y-3">
            {recipe.servings && (
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <span className="text-sm text-gray-600">Porciones</span>
                  <p className="text-lg font-semibold text-gray-900">{recipe.servings}</p>
                </div>
              </div>
            )}
            {recipe.prepTime && (
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="text-sm text-gray-600">Preparación</span>
                  <p className="text-lg font-semibold text-gray-900">{recipe.prepTime} min</p>
                </div>
              </div>
            )}
            {recipe.cookTime && (
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="text-sm text-gray-600">Cocción</span>
                  <p className="text-lg font-semibold text-gray-900">{recipe.cookTime} min</p>
                </div>
              </div>
            )}
            {recipe.prepTime && recipe.cookTime && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="text-sm text-gray-600">Tiempo total</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {recipe.prepTime + recipe.cookTime} min
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ingredientes - Resumen */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Ingredientes
          </h3>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">
              {recipe.ingredients.length}
            </p>
            <p className="text-sm text-gray-600">
              {recipe.ingredients.filter(ing => ing.isOptional).length > 0 && (
                <span>
                  {recipe.ingredients.filter(ing => ing.isOptional).length} opcional{recipe.ingredients.filter(ing => ing.isOptional).length > 1 ? 'es' : ''}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Estado */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Estado
          </h3>
          <div className="space-y-2">
            {!recipe.isGeneral ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                Privada
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Pública
              </span>
            )}
            {recipe.originalRecipe && (
              <p className="text-sm text-gray-600 mt-2">
                Copia de receta pública
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Instrucciones */}
      {recipe.instructions && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Instrucciones
          </h2>
          <div className="prose max-w-none">
            <p className="whitespace-pre-line text-gray-700 leading-relaxed">
              {recipe.instructions}
            </p>
          </div>
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
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {ingredient.product.name}
                  </span>
                  <span className="text-gray-600">
                    {ingredient.quantity} {ingredient.unit?.symbol || ''}
                  </span>
                  {ingredient.isOptional && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                      Opcional
                    </span>
                  )}
                </div>
                    {ingredient.article && !recipe.isGeneral && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600">Artículo:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {ingredient.article.name} ({ingredient.article.brand})
                    </span>
                    {user && recipe.createdBy.id === user.id && editingIngredientId !== ingredient.id && (
                      <button
                        onClick={() => {
                          setEditingIngredientId(ingredient.id);
                          fetchArticlesForIngredient(ingredient.id);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
                )}
                    {!ingredient.article && !recipe.isGeneral && user && recipe.createdBy.id === user.id && (
                  <button
                    onClick={() => {
                      setEditingIngredientId(ingredient.id);
                      fetchArticlesForIngredient(ingredient.id);
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Asociar artículo
                  </button>
                )}
                {editingIngredientId === ingredient.id && (
                  <div className="mt-2">
                    <select
                      value={ingredient.articleId || ''}
                      onChange={(e) => {
                        handleUpdateArticle(ingredient.id, e.target.value || null);
                      }}
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      onBlur={() => setEditingIngredientId(null)}
                    >
                      <option value="">Sin artículo asociado</option>
                      {(articlesByIngredient[ingredient.id] || []).map((article) => (
                        <option key={article.id} value={article.id}>
                          {article.name} ({article.brand})
                          {article.suggestedPrice &&
                            ` - €${article.suggestedPrice.toFixed(2)}`}
                        </option>
                      ))}
                    </select>
                  </div>
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
                        {ingredient.quantity} {ingredient.unit?.symbol || ''}
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
                        value={selection?.articleId || ingredient.articleId || ''}
                        onChange={(e) => {
                          setIngredientSelections((prev) => ({
                            ...prev,
                            [ingredient.id]: {
                              articleId: e.target.value,
                              quantity: ingredient.quantity,
                              unitId: ingredient.unitId || undefined,
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
                            {ingredient.articleId === article.id && ' (preseleccionado)'}
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

      {/* Modal para añadir a lista existente */}
      {showAddToListModal && recipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`w-full ${addToListStep === 'select-list' ? 'max-w-md' : 'max-w-2xl'} rounded-lg border border-gray-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto`}>
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {addToListStep === 'select-list' ? 'Añadir a Lista' : 'Seleccionar Artículos'}
            </h2>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {addToListStep === 'select-list' ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Selecciona una lista *
                  </label>
                  <select
                    required
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  >
                    <option value="">Seleccionar lista...</option>
                    {availableLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name} {list.ownerId !== user?.id && '(Compartida)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Porciones (opcional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addToListServings}
                    onChange={(e) => setAddToListServings(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder={recipe.servings?.toString() || '4'}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Las cantidades se ajustarán según las porciones
                  </p>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddToListModal(false);
                      setSelectedListId('');
                      setAddToListServings('');
                      setError('');
                      setAddToListStep('select-list');
                      setAddToListSelections({});
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToListNext}
                    disabled={!selectedListId}
                    className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 max-h-96 space-y-4 overflow-y-auto">
                  <h3 className="font-semibold text-gray-900">
                    Selecciona artículos para cada ingrediente:
                  </h3>
                  {recipe.ingredients.map((ingredient) => {
                    const articles = articlesByIngredient[ingredient.id] || [];
                    const selection = addToListSelections[ingredient.id];

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
                            {ingredient.quantity} {ingredient.unit?.symbol || ''}
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
                            value={selection?.articleId || ingredient.articleId || ''}
                            onChange={(e) => {
                              setAddToListSelections((prev) => ({
                                ...prev,
                                [ingredient.id]: {
                                  articleId: e.target.value,
                                  quantity: ingredient.quantity,
                                  unitId: ingredient.unitId || undefined,
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
                                {ingredient.articleId === article.id && ' (preseleccionado)'}
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
                      setAddToListStep('select-list');
                      setError('');
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddToListModal(false);
                      setSelectedListId('');
                      setAddToListServings('');
                      setError('');
                      setAddToListStep('select-list');
                      setAddToListSelections({});
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToList}
                    disabled={addingToList}
                    className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {addingToList ? 'Añadiendo...' : 'Añadir a Lista'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de edición de receta */}
      {showEditModal && recipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 146, 60, 0.1) 100%)',
          backdropFilter: 'blur(4px)',
        }}>
          <div className="relative w-full max-w-5xl mx-4 rounded-lg border border-gray-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Patrón decorativo de fondo */}
            <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden rounded-lg">
              <svg className="absolute top-0 left-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                {/* Iconos de cocina decorativos */}
                <g fill="currentColor" stroke="currentColor" strokeWidth="0.5">
                  {/* Cuchara */}
                  <path d="M10 20 Q15 15 20 20 L22 35 Q22 40 18 40 Q14 40 14 35 Z" />
                  {/* Tenedor */}
                  <path d="M30 20 L30 35 M28 20 L28 35 M32 20 L32 35 M29 20 Q30 15 31 20" />
                  {/* Cuchillo */}
                  <path d="M50 20 L50 40 M48 20 L52 20" />
                  {/* Olla */}
                  <circle cx="70" cy="30" r="8" fill="none" />
                  <path d="M62 30 L78 30 M65 25 L75 25" />
                  {/* Sarten */}
                  <circle cx="20" cy="60" r="6" fill="none" />
                  <path d="M14 60 L26 60 M20 54 L20 66" />
                  {/* Batidora */}
                  <rect x="45" y="55" width="8" height="12" fill="none" />
                  <circle cx="49" cy="59" r="2" />
                  {/* Horno */}
                  <rect x="70" y="55" width="12" height="10" fill="none" />
                  <rect x="72" y="57" width="8" height="6" fill="none" />
                </g>
              </svg>
            </div>
            <div className="relative z-10">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Editar Receta
            </h2>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Porciones
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editServings}
                    onChange={(e) => setEditServings(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tiempo Preparación (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editPrepTime}
                    onChange={(e) => setEditPrepTime(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tiempo Cocción (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editCookTime}
                    onChange={(e) => setEditCookTime(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Instrucciones
                </label>
                <textarea
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  rows={6}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Gestión de ingredientes */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Ingredientes
                </h3>
                <IngredientForm
                  onSave={async (productId, quantity, unitId, isOptional, notes) => {
                    await handleAddIngredient(productId, parseFloat(quantity), unitId, isOptional, notes);
                  }}
                  buttonText="Agregar Ingrediente"
                  units={units}
                  showToast={showToast}
                />
              </div>

              <div className="space-y-3">
                {recipe.ingredients.map((ingredient) => (
                  <IngredientRow
                    key={ingredient.id}
                    ingredient={ingredient}
                    onUpdate={async (productId, quantity, unitId, isOptional, notes) => {
                      await handleUpdateIngredient(ingredient.id, productId, parseFloat(quantity), unitId, isOptional, notes);
                    }}
                    onDelete={async () => await handleDeleteIngredient(ingredient.id)}
                    units={units}
                    showToast={showToast}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setError('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRecipe}
                disabled={editingRecipe}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {editingRecipe ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Componente para formulario de ingrediente
function IngredientForm({
  onSave,
  buttonText,
  initialValues,
  units,
  showToast,
}: {
  onSave: (productId: string, quantity: string, unitId: string, isOptional: boolean, notes: string) => Promise<void>;
  buttonText: string;
  initialValues?: {
    productId?: string;
    quantity?: number;
    unitId?: string;
    isOptional?: boolean;
    notes?: string;
  };
  units: Array<{ id: string; name: string; symbol: string }>;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState(initialValues?.productId || 'all');
  const [quantity, setQuantity] = useState(initialValues?.quantity?.toString() || '');
  const [unitId, setUnitId] = useState(initialValues?.unitId || units.find(u => u.symbol === 'un')?.id || units[0]?.id || '');
  const [isOptional, setIsOptional] = useState(initialValues?.isOptional || false);
  const [notes, setNotes] = useState(initialValues?.notes || '');

  // Resetear estado cuando se abre el formulario
  useEffect(() => {
    if (showForm) {
      setSaving(false);
    }
  }, [showForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || productId === 'all' || !quantity || !unitId) {
      showToast('error', 'Por favor, selecciona un producto, ingresa una cantidad y selecciona una unidad');
      return;
    }
    
    setSaving(true);
    try {
      await onSave(productId, quantity, unitId, isOptional, notes);
      setProductId('all');
      setQuantity('');
      setUnitId(units.find(u => u.symbol === 'un')?.id || units[0]?.id || '');
      setIsOptional(false);
      setNotes('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => {
          setSaving(false);
          setShowForm(true);
        }}
        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
      >
        {buttonText}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-gray-200 bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Producto *</label>
          <div className="mt-1">
            <SearchableSelect
              value={productId}
              onChange={(value) => setProductId(value)}
              placeholder="Buscar producto (mín. 3 caracteres)..."
              searchEndpoint="/api/products/search"
              minChars={3}
              debounceMs={500}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Cantidad *</label>
          <input
            type="number"
            step="0.1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Unidad *</label>
          <select
            required
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.symbol} ({unit.name})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isOptional}
              onChange={(e) => setIsOptional(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-xs text-gray-700">Opcional</span>
          </label>
        </div>
      </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700">Notas</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
          />
        </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

// Componente para fila de ingrediente editable
function IngredientRow({
  ingredient,
  onUpdate,
  onDelete,
  units,
  showToast,
}: {
  ingredient: RecipeIngredient;
  onUpdate: (productId: string, quantity: string, unitId: string, isOptional: boolean, notes: string) => Promise<void>;
  onDelete: () => void;
  units: Array<{ id: string; name: string; symbol: string }>;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState(ingredient.product.id);
  const [quantity, setQuantity] = useState(ingredient.quantity.toString());
  const [unitId, setUnitId] = useState(ingredient.unitId || units.find(u => u.symbol === 'un')?.id || units[0]?.id || '');
  const [isOptional, setIsOptional] = useState(ingredient.isOptional);
  const [notes, setNotes] = useState(ingredient.notes || '');

  // Resetear estado cuando se abre el formulario de edición
  useEffect(() => {
    if (isEditing) {
      setSaving(false);
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!productId || productId === 'all' || !quantity || !unitId) {
      showToast('error', 'Por favor, selecciona un producto, ingresa una cantidad y selecciona una unidad');
      return;
    }
    setSaving(true);
    try {
      await onUpdate(productId, quantity, unitId, isOptional, notes);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Producto *</label>
            <div className="mt-1">
              <SearchableSelect
                value={productId}
                onChange={(value) => setProductId(value)}
                placeholder="Buscar producto (mín. 3 caracteres)..."
                searchEndpoint="/api/products/search"
                minChars={3}
                debounceMs={500}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Cantidad *</label>
            <input
              type="number"
              step="0.1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Unidad *</label>
            <select
              required
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
            >
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.symbol} ({unit.name})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isOptional}
                onChange={(e) => setIsOptional(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-xs text-gray-700">Opcional</span>
            </label>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700">Notas</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            disabled={saving}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3">
      <div className="flex-1">
        <span className="font-medium text-gray-900">{ingredient.product.name}</span>
        <span className="ml-2 text-gray-600">
          {ingredient.quantity} {ingredient.unit?.symbol || ''}
        </span>
        {ingredient.isOptional && (
          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
            Opcional
          </span>
        )}
        {ingredient.notes && (
          <p className="mt-1 text-sm text-gray-500">{ingredient.notes}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

