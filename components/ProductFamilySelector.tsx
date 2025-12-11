'use client';

import { useEffect, useState } from 'react';
import ProductFamilyModal from './ProductFamilyModal';

interface ProductFamily {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
}

interface ProductFamilySelectorProps {
  selectedFamilyIds: string[];
  onChange: (familyIds: string[]) => void;
  placeholder?: string;
}

export default function ProductFamilySelector({
  selectedFamilyIds,
  onChange,
  placeholder = 'Seleccionar familias...',
}: ProductFamilySelectorProps) {
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/product-families?limit=1000');
      const data = await res.json();
      if (res.ok) {
        setFamilies(data.families || []);
      }
    } catch (err) {
      console.error('Error fetching families:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFamily = (familyId: string) => {
    if (selectedFamilyIds.includes(familyId)) {
      onChange(selectedFamilyIds.filter((id) => id !== familyId));
    } else {
      onChange([...selectedFamilyIds, familyId]);
    }
  };

  const handleCreateSuccess = () => {
    fetchFamilies();
  };

  const filteredFamilies = families.filter((family) =>
    family.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedFamilies = families.filter((f) =>
    selectedFamilyIds.includes(f.id)
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Familias
        </label>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + Crear familia
        </button>
      </div>

      {/* Familias seleccionadas */}
      {selectedFamilies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFamilies.map((family) => (
            <span
              key={family.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
            >
              {family.name}
              <button
                type="button"
                onClick={() => handleToggleFamily(family.id)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Buscador y lista de familias */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
        {search && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
            {loading ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Cargando...
              </div>
            ) : filteredFamilies.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Sin resultados
              </div>
            ) : (
              <ul className="py-1">
                {filteredFamilies.map((family) => {
                  const isSelected = selectedFamilyIds.includes(family.id);
                  return (
                    <li
                      key={family.id}
                      onClick={() => handleToggleFamily(family.id)}
                      className={`cursor-pointer px-4 py-2 text-sm hover:bg-gray-100 ${
                        isSelected
                          ? 'bg-blue-50 text-blue-900'
                          : 'text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{family.name}</span>
                        {isSelected && (
                          <span className="text-blue-600">✓</span>
                        )}
                      </div>
                      {family.description && (
                        <div className="text-xs text-gray-500">
                          {family.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        {family.isGeneral ? 'General' : 'Particular'}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Lista completa cuando no hay búsqueda */}
      {!search && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Cargando...</div>
          ) : families.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              No hay familias disponibles
            </div>
          ) : (
            families.map((family) => {
              const isSelected = selectedFamilyIds.includes(family.id);
              return (
                <label
                  key={family.id}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleFamily(family.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 font-medium">{family.name}</span>
                  {family.description && (
                    <span className="text-xs text-gray-500">
                      {family.description}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {family.isGeneral ? 'General' : 'Particular'}
                  </span>
                </label>
              );
            })
          )}
        </div>
      )}

      <ProductFamilyModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

