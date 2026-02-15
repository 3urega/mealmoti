'use client';

interface Subfamily {
  id: string;
  name: string;
  description?: string | null;
  familyId: string;
  productsCount: number;
}

interface SubfamilyGridProps {
  subfamilies: Subfamily[];
  onSubfamilyClick: (subfamilyId: string) => void;
}

export default function SubfamilyGrid({
  subfamilies,
  onSubfamilyClick,
}: SubfamilyGridProps) {
  if (subfamilies.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="mb-4 text-xl font-semibold text-gray-900">
        Subfamilias
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {subfamilies.map((subfamily) => (
          <button
            key={subfamily.id}
            onClick={() => onSubfamilyClick(subfamily.id)}
            className="group flex flex-col items-center justify-center rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-center transition-all duration-200 hover:scale-105 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md"
          >
            <h4 className="mb-2 text-sm font-semibold text-blue-900">
              {subfamily.name}
            </h4>
            <span className="text-xs text-blue-700">
              {subfamily.productsCount} producto{subfamily.productsCount !== 1 ? 's' : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

