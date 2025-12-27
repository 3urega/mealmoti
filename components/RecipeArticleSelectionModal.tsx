'use client';

import { useState, useEffect } from 'react';
import SearchableArticleSelect from '@/components/SearchableArticleSelect';

interface RecipeIngredient {
  id: string;
  product: {
    id: string;
    name: string;
  };
  quantity: number;
  unit?: {
    id: string;
    symbol: string;
  } | null;
}

interface ArticleSelection {
  recipeIngredientId: string;
  articleId: string;
}

interface RecipeArticleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name?: string;
    items: ArticleSelection[];
    setAsActive?: boolean;
  }) => Promise<void>;
  onSaveAsNew?: (data: {
    name?: string;
    items: ArticleSelection[];
    setAsActive?: boolean;
  }) => Promise<void>;
  ingredients: RecipeIngredient[];
  existingSelection?: {
    id: string;
    name?: string | null;
    items: Array<{
      recipeIngredientId: string;
      articleId: string;
    }>;
  } | null;
  mode?: 'create' | 'edit';
}

export default function RecipeArticleSelectionModal({
  isOpen,
  onClose,
  onSave,
  onSaveAsNew,
  ingredients,
  existingSelection,
  mode = 'create',
}: RecipeArticleSelectionModalProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [selectionName, setSelectionName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Inicializar selecciones desde existingSelection o vacío
      const initialSelections: Record<string, string> = {};
      if (existingSelection) {
        existingSelection.items.forEach((item) => {
          initialSelections[item.recipeIngredientId] = item.articleId;
        });
        setSelectionName(existingSelection.name || '');
      } else {
        // Si hay artículos ya asociados en los ingredientes, usarlos como valores iniciales
        ingredients.forEach((ing) => {
          // No hay artículo pre-seleccionado en modo creación
        });
      }
      setSelections(initialSelections);
      setError('');
      setSaving(false);
    }
  }, [isOpen, existingSelection, ingredients]);

  const handleSave = async (saveAsNew: boolean = false) => {
    setError('');

    // Validar que todos los ingredientes tienen artículo seleccionado
    const missingIngredients = ingredients.filter(
      (ing) => !selections[ing.id] || selections[ing.id] === ''
    );

    if (missingIngredients.length > 0) {
      setError(
        `Debes seleccionar un artículo para: ${missingIngredients.map((ing) => ing.product.name).join(', ')}`
      );
      return;
    }

    setSaving(true);

    try {
      const items: ArticleSelection[] = ingredients.map((ing) => ({
        recipeIngredientId: ing.id,
        articleId: selections[ing.id],
      }));

      if (saveAsNew && onSaveAsNew) {
        await onSaveAsNew({
          name: selectionName || undefined,
          items,
          setAsActive: false,
        });
      } else {
        await onSave({
          name: selectionName || undefined,
          items,
          setAsActive: mode === 'create' && !existingSelection,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la selección');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-3xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'edit' && existingSelection
                ? 'Editar Selección de Artículos'
                : 'Asociar Artículos a la Receta'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={saving}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Campo de nombre opcional */}
          <div className="mb-6">
            <label
              htmlFor="selection-name"
              className="block text-sm font-medium text-gray-700"
            >
              Nombre de la selección (opcional)
            </label>
            <input
              id="selection-name"
              type="text"
              value={selectionName}
              onChange={(e) => setSelectionName(e.target.value)}
              placeholder="Ej: Selección básica, Selección premium..."
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          {/* Lista de ingredientes con selectores de artículos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Seleccionar artículos para cada ingrediente
            </h3>
            {ingredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-3">
                  <span className="font-medium text-gray-900">
                    {ingredient.product.name}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">
                    {ingredient.quantity}{' '}
                    {ingredient.unit?.symbol || 'unidades'}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Artículo *
                  </label>
                  <SearchableArticleSelect
                    value={selections[ingredient.id] || ''}
                    onChange={(articleId) => {
                      setSelections((prev) => ({
                        ...prev,
                        [ingredient.id]: articleId,
                      }));
                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder={`Buscar artículo de ${ingredient.product.name}... (mínimo 3 caracteres)`}
                    searchEndpoint={`/api/articles/search?productId=${encodeURIComponent(ingredient.product.id)}`}
                    minChars={3}
                    debounceMs={1000}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            {mode === 'edit' && existingSelection && onSaveAsNew && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Guardar como Nueva
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar Cambios' : 'Guardar Selección'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

