'use client';

import { useEffect, useState } from 'react';

interface Tag {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
}

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  error?: string;
}

export default function TagSelector({
  selectedTagIds,
  onChange,
  error,
}: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/product-tags');
      const data = await res.json();
      if (res.ok) {
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter(
    (tag) =>
      !selectedTagIds.includes(tag.id) &&
      tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const handleTagSelect = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      onChange([...selectedTagIds, tagId]);
    }
    setSearch('');
    setShowDropdown(false);
  };

  const handleTagRemove = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Tags
      </label>
      <div className="relative">
        {/* Tags seleccionados */}
        {selectedTags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleTagRemove(tag.id)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input de búsqueda */}
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Buscar tags..."
          className={`block w-full rounded-md border ${
            error ? 'border-red-300' : 'border-gray-300'
          } bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500`}
        />

        {/* Dropdown de tags */}
        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
              {loading ? (
                <div className="p-3 text-sm text-gray-500">Cargando...</div>
              ) : filteredTags.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">
                  {search
                    ? 'No se encontraron tags'
                    : 'Todos los tags disponibles están seleccionados'}
                </div>
              ) : (
                <ul className="py-1">
                  {filteredTags.map((tag) => (
                    <li
                      key={tag.id}
                      onClick={() => handleTagSelect(tag.id)}
                      className="cursor-pointer px-3 py-2 text-sm text-gray-900 hover:bg-gray-100"
                    >
                      {tag.name}
                      {tag.isGeneral && (
                        <span className="ml-2 text-xs text-gray-500">
                          (General)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

