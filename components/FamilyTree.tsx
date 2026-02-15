'use client';

import { useState } from 'react';

interface Variety {
  id: string;
  name: string;
  subfamilyId: string;
  productsCount: number;
}

interface Subfamily {
  id: string;
  name: string;
  description?: string | null;
  familyId: string;
  productsCount: number;
  varieties: Variety[];
}

interface Family {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  productsCount: number;
  subfamilies: Subfamily[];
}

interface FamilyTreeProps {
  families: Family[];
  selectedFamilyId?: string | null;
  selectedSubfamilyId?: string | null;
  selectedVarietyId?: string | null;
  onFamilySelect: (familyId: string) => void;
  onSubfamilySelect: (subfamilyId: string) => void;
  onVarietySelect: (varietyId: string) => void;
}

export default function FamilyTree({
  families,
  selectedFamilyId,
  selectedSubfamilyId,
  selectedVarietyId,
  onFamilySelect,
  onSubfamilySelect,
  onVarietySelect,
}: FamilyTreeProps) {
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(
    new Set(selectedFamilyId ? [selectedFamilyId] : [])
  );
  const [expandedSubfamilies, setExpandedSubfamilies] = useState<Set<string>>(
    new Set(selectedSubfamilyId ? [selectedSubfamilyId] : [])
  );

  const toggleFamily = (familyId: string) => {
    const newExpanded = new Set(expandedFamilies);
    if (newExpanded.has(familyId)) {
      newExpanded.delete(familyId);
    } else {
      newExpanded.add(familyId);
    }
    setExpandedFamilies(newExpanded);
  };

  const toggleSubfamily = (subfamilyId: string) => {
    const newExpanded = new Set(expandedSubfamilies);
    if (newExpanded.has(subfamilyId)) {
      newExpanded.delete(subfamilyId);
    } else {
      newExpanded.add(subfamilyId);
    }
    setExpandedSubfamilies(newExpanded);
  };

  const handleFamilyClick = (familyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFamily(familyId);
    onFamilySelect(familyId);
  };

  const handleSubfamilyClick = (
    subfamilyId: string,
    familyId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    toggleSubfamily(subfamilyId);
    onSubfamilySelect(subfamilyId);
    // También expandir la familia padre si no está expandida
    if (!expandedFamilies.has(familyId)) {
      setExpandedFamilies(new Set([...expandedFamilies, familyId]));
    }
  };

  const handleVarietyClick = (
    varietyId: string,
    subfamilyId: string,
    familyId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    onVarietySelect(varietyId);
    // Expandir padres si no están expandidos
    if (!expandedFamilies.has(familyId)) {
      setExpandedFamilies(new Set([...expandedFamilies, familyId]));
    }
    if (!expandedSubfamilies.has(subfamilyId)) {
      setExpandedSubfamilies(new Set([...expandedSubfamilies, subfamilyId]));
    }
  };

  return (
    <div className="h-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Categorías
      </h2>
      <nav className="space-y-1">
        {families.map((family) => {
          const isFamilyExpanded = expandedFamilies.has(family.id);
          const isFamilySelected = selectedFamilyId === family.id;

          return (
            <div key={family.id} className="space-y-1">
              {/* Familia */}
              <div
                className={`group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  isFamilySelected
                    ? 'bg-green-50 text-green-900 border-l-4 border-green-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={(e) => handleFamilyClick(family.id, e)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Icono de chevron */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFamily(family.id);
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${
                        isFamilyExpanded ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  <span className="font-medium truncate">{family.name}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    ({family.productsCount})
                  </span>
                </div>
              </div>

              {/* Subfamilias */}
              {isFamilyExpanded && family.subfamilies.length > 0 && (
                <div className="ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
                  {family.subfamilies.map((subfamily) => {
                    const isSubfamilyExpanded = expandedSubfamilies.has(
                      subfamily.id
                    );
                    const isSubfamilySelected =
                      selectedSubfamilyId === subfamily.id;

                    return (
                      <div key={subfamily.id} className="space-y-1">
                        {/* Subfamilia */}
                        <div
                          className={`group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                            isSubfamilySelected
                              ? 'bg-green-50 text-green-900 border-l-4 border-green-500'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                          onClick={(e) =>
                            handleSubfamilyClick(
                              subfamily.id,
                              family.id,
                              e
                            )
                          }
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Icono de chevron */}
                            {subfamily.varieties.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSubfamily(subfamily.id);
                                }}
                                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                              >
                                <svg
                                  className={`h-3 w-3 transition-transform ${
                                    isSubfamilyExpanded ? 'rotate-90' : ''
                                  }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </button>
                            )}
                            <span className="truncate">{subfamily.name}</span>
                            <span className="ml-auto text-xs text-gray-500">
                              ({subfamily.productsCount})
                            </span>
                          </div>
                        </div>

                        {/* Variedades */}
                        {isSubfamilyExpanded &&
                          subfamily.varieties.length > 0 && (
                            <div className="ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
                              {subfamily.varieties.map((variety) => {
                                const isVarietySelected =
                                  selectedVarietyId === variety.id;

                                return (
                                  <div
                                    key={variety.id}
                                    className={`group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs transition-colors ${
                                      isVarietySelected
                                        ? 'bg-green-50 text-green-900 border-l-4 border-green-400'
                                        : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                                    onClick={(e) =>
                                      handleVarietyClick(
                                        variety.id,
                                        subfamily.id,
                                        family.id,
                                        e
                                      )
                                    }
                                  >
                                    <span className="truncate">
                                      {variety.name}
                                    </span>
                                    <span className="ml-auto text-xs text-gray-400">
                                      ({variety.productsCount})
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

