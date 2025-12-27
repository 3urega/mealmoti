'use client';

import { useState, useEffect, useRef } from 'react';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
}

interface SearchableProductSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onBlur?: () => void;
}

export default function SearchableProductSelect({
  value,
  onChange,
  placeholder = 'Buscar producto...',
  disabled = false,
  error,
  onBlur,
}: SearchableProductSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar producto seleccionado cuando hay un value
  useEffect(() => {
    if (value && value !== '') {
      // Solo cargar si no hay producto seleccionado o el ID no coincide
      const shouldLoad = !selectedProduct || selectedProduct.id !== value;
      if (shouldLoad) {
        fetch(`/api/products/${value}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.product && data.product.id === value) {
              setSelectedProduct(data.product);
              setSearchQuery(data.product.name);
            }
          })
          .catch(() => {
            // Si falla, simplemente no mostrar nada
          });
      }
    } else {
      if (selectedProduct) {
        setSelectedProduct(null);
        setSearchQuery('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Búsqueda en tiempo real
  useEffect(() => {
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Si el query tiene menos de 3 caracteres, limpiar resultados
    if (searchQuery.trim().length < 3) {
      setOptions([]);
      setLoading(false);
      return;
    }

    // Si el query coincide con el producto seleccionado, no buscar
    if (selectedProduct && searchQuery === selectedProduct.name) {
      setOptions([]);
      return;
    }

    // Iniciar búsqueda después de 1 segundo de inactividad
    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products/search?q=${encodeURIComponent(searchQuery.trim())}&limit=20`
        );
        const data = await res.json();

        if (res.ok && data.products) {
          setOptions(data.products);
        } else {
          setOptions([]);
        }
      } catch (err) {
        console.error('Error searching products:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 1000);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchQuery, selectedProduct]);

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

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    onChange(product.id);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setShowDropdown(true);
    
    // Si se borra todo, limpiar selección
    if (newQuery === '') {
      setSelectedProduct(null);
      onChange('');
    }
  };

  const handleInputFocus = () => {
    if (disabled) return;
    if (searchQuery.length >= 3) {
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
          onBlur={onBlur}
          disabled={disabled}
          placeholder={selectedProduct ? selectedProduct.name : placeholder}
          className={`block w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 ${
            error
              ? 'border-red-300 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {selectedProduct && !disabled && (
          <button
            type="button"
            onClick={() => {
              setSelectedProduct(null);
              setSearchQuery('');
              onChange('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Limpiar selección"
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

      {showDropdown && !disabled && searchQuery.trim().length >= 3 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Buscando productos...</div>
          ) : options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              No se encontraron productos
            </div>
          ) : (
            <ul className="py-1">
              {options.map((product) => (
                <li
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className={`cursor-pointer px-4 py-2 text-sm hover:bg-gray-100 ${
                    selectedProduct?.id === product.id
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-900'
                  }`}
                >
                  <div className="font-medium">{product.name}</div>
                  {product.description && (
                    <div className="text-xs text-gray-500">
                      {product.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    {product.isGeneral ? 'General' : 'Particular'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {searchQuery.length > 0 && searchQuery.length < 3 && (
        <p className="mt-1 text-xs text-gray-500">
          Escribe al menos 3 caracteres para buscar
        </p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

