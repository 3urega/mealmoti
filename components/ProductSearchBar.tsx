'use client';

import { useEffect, useState, useRef } from 'react';

interface ProductSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function ProductSearchBar({
  onSearch,
  placeholder = 'Buscar productos...',
}: ProductSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Si la búsqueda tiene menos de 3 caracteres, limpiar resultados
    if (searchQuery.trim().length < 3) {
      onSearch('');
      return;
    }

    // Esperar 2 segundos antes de buscar
    searchTimeoutRef.current = setTimeout(() => {
      onSearch(searchQuery.trim());
    }, 2000);

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, onSearch]);

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <div className="w-full">
      <div
        className={`relative flex items-center rounded-lg border-2 bg-white shadow-sm transition-all ${
          isFocused
            ? 'border-green-500 shadow-md'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* Icono de lupa */}
        <div className="pl-4">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input de búsqueda */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full border-0 bg-transparent px-4 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
        />

        {/* Botón de limpiar */}
        {searchQuery && (
          <button
            onClick={handleClear}
            className="mr-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Limpiar búsqueda"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Indicador de búsqueda activa */}
        {searchQuery.trim().length >= 3 && (
          <div className="mr-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
          </div>
        )}
      </div>

      {/* Mensaje de ayuda */}
      {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
        <p className="mt-2 text-sm text-gray-500">
          Escribe al menos 3 caracteres para buscar
        </p>
      )}
    </div>
  );
}

