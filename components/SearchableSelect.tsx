'use client';

import { useState, useEffect, useRef } from 'react';

interface Option {
  id: string;
  name: string;
  description?: string | null;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchEndpoint: string;
  minChars?: number;
  debounceMs?: number;
  onClear?: () => void;
}

export default function SearchableSelect({
  value,
  onChange,
  placeholder = 'Buscar...',
  searchEndpoint,
  minChars = 3,
  debounceMs = 1000,
  onClear,
}: SearchableSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar opciones cuando cambia el query (con debounce)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.length < minChars) {
      setOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${searchEndpoint}?q=${encodeURIComponent(searchQuery)}&limit=20`);
        const data = await res.json();
        if (res.ok) {
          setOptions(data.products || []);
        }
      } catch (err) {
        console.error('Error searching:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, searchEndpoint, minChars, debounceMs]);

  // Cargar opción seleccionada si hay un value
  useEffect(() => {
    if (value && value !== 'all' && !selectedOption) {
      // Si hay un value pero no hay selectedOption, buscar el producto
      fetch(`/api/products/${value}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.product) {
            setSelectedOption({
              id: data.product.id,
              name: data.product.name,
              description: data.product.description,
            });
            setSearchQuery(data.product.name);
          }
        })
        .catch(() => {
          // Si falla, simplemente no mostrar nada
        });
    } else if (!value || value === 'all') {
      setSelectedOption(null);
      setSearchQuery('');
    }
  }, [value]);

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option: Option) => {
    setSelectedOption(option);
    setSearchQuery(option.name);
    onChange(option.id);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSelectedOption(null);
    setSearchQuery('');
    onChange('all');
    setShowDropdown(false);
    if (onClear) {
      onClear();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setShowDropdown(true);
    
    // Si se borra todo, limpiar selección
    if (newQuery === '') {
      setSelectedOption(null);
      onChange('all');
    }
  };

  const handleInputFocus = () => {
    if (searchQuery.length >= minChars) {
      setShowDropdown(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={selectedOption ? selectedOption.name : placeholder}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
        {selectedOption && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Limpiar filtro"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
      </div>

      {showDropdown && searchQuery.length >= minChars && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Buscando...</div>
          ) : options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              Sin resultados
            </div>
          ) : (
            <ul className="py-1">
              {options.map((option) => (
                <li
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  className={`cursor-pointer px-4 py-2 text-sm hover:bg-gray-100 ${
                    selectedOption?.id === option.id
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-900'
                  }`}
                >
                  <div className="font-medium">{option.name}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500">
                      {option.description}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {searchQuery.length > 0 && searchQuery.length < minChars && (
        <p className="mt-1 text-xs text-gray-500">
          Escribe al menos {minChars} caracteres para buscar
        </p>
      )}
    </div>
  );
}

