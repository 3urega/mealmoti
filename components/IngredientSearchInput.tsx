'use client';

import { useState, useEffect, useRef } from 'react';

interface Ingredient {
  id: string;
  name: string;
  type: string;
  description?: string | null;
}

interface IngredientSearchInputProps {
  onSelectIngredient: (ingredientId: string) => void;
  onCreateIngredient: (name: string) => Promise<void>;
  excludeIngredientIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export default function IngredientSearchInput({
  onSelectIngredient,
  onCreateIngredient,
  excludeIngredientIds = [],
  placeholder = 'Escribe el nombre del ingrediente...',
  disabled = false,
}: IngredientSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Búsqueda en tiempo real
  useEffect(() => {
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Si el query tiene menos de 2 caracteres, limpiar resultados
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      setShowDropdown(false);
      return;
    }

    // Iniciar búsqueda después de 500ms de inactividad
    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/ingredients?search=${encodeURIComponent(searchQuery.trim())}&limit=10`
        );
        const data = await res.json();

        if (res.ok && data.ingredients) {
          // Filtrar ingredientes excluidos (ya asignados)
          const excludedSet = new Set(excludeIngredientIds);
          const filtered = data.ingredients.filter(
            (ing: Ingredient) => !excludedSet.has(ing.id)
          );
          setSuggestions(filtered);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Error searching ingredients:', err);
        setSuggestions([]);
        setShowDropdown(true);
      } finally {
        setLoading(false);
      }
    }, 500);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchQuery, excludeIngredientIds]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  const handleSelectSuggestion = (ingredient: Ingredient) => {
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onSelectIngredient(ingredient.id);
  };

  const handleCreateNew = async () => {
    const trimmedName = searchQuery.trim();
    if (!trimmedName || trimmedName.length < 1) {
      return;
    }

    setCreating(true);
    try {
      await onCreateIngredient(trimmedName);
      setSearchQuery('');
      setSuggestions([]);
      setShowDropdown(false);
    } catch (err) {
      console.error('Error creating ingredient:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    if (newQuery.trim().length >= 2) {
      setShowDropdown(true);
    }
  };

  const handleInputFocus = () => {
    if (disabled) return;
    if (searchQuery.trim().length >= 2) {
      setShowDropdown(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim().length >= 1) {
      e.preventDefault();
      // Si hay sugerencias, seleccionar la primera
      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
      } else {
        // Si no hay sugerencias, crear nuevo
        handleCreateNew();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const hasExactMatch = suggestions.some(
    (ing) => ing.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );
  const canCreateNew = searchQuery.trim().length >= 1 && !hasExactMatch;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled || creating}
            placeholder={placeholder}
            className={`block w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 ${
              disabled || creating
                ? 'bg-gray-100 cursor-not-allowed border-gray-300'
                : 'border-gray-300 focus:border-blue-500'
            }`}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          )}
        </div>
        {canCreateNew && (
          <button
            type="button"
            onClick={handleCreateNew}
            disabled={disabled || creating}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creando...' : 'Crear'}
          </button>
        )}
      </div>

      {showDropdown && searchQuery.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              Buscando ingredientes...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-2">
              <div className="text-sm text-gray-500 mb-2">
                No se encontraron ingredientes similares.
              </div>
              {canCreateNew && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={creating}
                  className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {creating ? 'Creando...' : `Crear "${searchQuery.trim()}"`}
                </button>
              )}
            </div>
          ) : (
            <div>
              <ul className="py-1">
                {suggestions.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    onClick={() => handleSelectSuggestion(ingredient)}
                    className="cursor-pointer px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    <div className="font-medium">{ingredient.name}</div>
                    {ingredient.type && (
                      <div className="text-xs text-gray-500">Tipo: {ingredient.type}</div>
                    )}
                    {ingredient.description && (
                      <div className="text-xs text-gray-400 truncate">
                        {ingredient.description}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {canCreateNew && (
                <div className="border-t border-gray-200 px-4 py-2">
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    disabled={creating}
                    className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {creating ? 'Creando...' : `Crear nuevo: "${searchQuery.trim()}"`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {searchQuery.length > 0 && searchQuery.length < 2 && (
        <p className="mt-1 text-xs text-gray-500">
          Escribe al menos 2 caracteres para buscar
        </p>
      )}
    </div>
  );
}

