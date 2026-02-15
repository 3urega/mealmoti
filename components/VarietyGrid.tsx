'use client';

interface Variety {
  id: string;
  name: string;
  subfamilyId: string;
  productsCount: number;
}

interface VarietyGridProps {
  varieties: Variety[];
  onVarietyClick: (varietyId: string) => void;
}

export default function VarietyGrid({
  varieties,
  onVarietyClick,
}: VarietyGridProps) {
  if (varieties.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="mb-4 text-xl font-semibold text-gray-900">
        Variedades
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {varieties.map((variety) => (
          <button
            key={variety.id}
            onClick={() => onVarietyClick(variety.id)}
            className="group flex flex-col items-center justify-center rounded-lg border-2 border-green-200 bg-green-50 p-3 text-center transition-all duration-200 hover:scale-105 hover:border-green-300 hover:bg-green-100 hover:shadow-md"
          >
            <h4 className="mb-1 text-xs font-semibold text-green-900">
              {variety.name}
            </h4>
            <span className="text-xs text-green-700">
              {variety.productsCount} producto{variety.productsCount !== 1 ? 's' : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

