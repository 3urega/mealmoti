'use client';

interface Family {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  productsCount: number;
}

interface FamilyGridProps {
  families: Family[];
  onFamilyClick: (familyId: string) => void;
}

// Colores pastel temáticos de alimentos (10 colores)
const FAMILY_COLORS = [
  'bg-red-50 border-red-100 hover:bg-red-100', // tomates, carnes
  'bg-green-50 border-green-100 hover:bg-green-100', // verduras, frutas
  'bg-yellow-50 border-yellow-100 hover:bg-yellow-100', // cereales, pan
  'bg-blue-50 border-blue-100 hover:bg-blue-100', // pescados, mariscos
  'bg-orange-50 border-orange-100 hover:bg-orange-100', // cítricos, zanahorias
  'bg-purple-50 border-purple-100 hover:bg-purple-100', // frutas moradas
  'bg-pink-50 border-pink-100 hover:bg-pink-100', // frutas rojas
  'bg-amber-50 border-amber-100 hover:bg-amber-100', // miel, especias
  'bg-lime-50 border-lime-100 hover:bg-lime-100', // limas, aguacates
  'bg-teal-50 border-teal-100 hover:bg-teal-100', // productos frescos
];

const FAMILY_COLOR_TEXTS = [
  'text-red-800',
  'text-green-800',
  'text-yellow-800',
  'text-blue-800',
  'text-orange-800',
  'text-purple-800',
  'text-pink-800',
  'text-amber-800',
  'text-lime-800',
  'text-teal-800',
];

// Iconos SVG simples para familias (pueden mejorarse después)
const getFamilyIcon = (index: number) => {
  const iconIndex = index % 10;
  // Usar un icono genérico de categoría para todas las familias
  return (
    <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 20 20">
      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
    </svg>
  );
};

export default function FamilyGrid({
  families,
  onFamilyClick,
}: FamilyGridProps) {
  if (families.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-600">No hay familias disponibles.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {families.map((family, index) => {
        const colorIndex = index % FAMILY_COLORS.length;
        const colorClass = FAMILY_COLORS[colorIndex];
        const textColorClass = FAMILY_COLOR_TEXTS[colorIndex];

        return (
          <button
            key={family.id}
            onClick={() => onFamilyClick(family.id)}
            className={`group relative flex flex-col items-center justify-center rounded-xl border-2 p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg ${colorClass}`}
          >
            {/* Icono */}
            <div className={`mb-4 ${textColorClass}`}>
              {getFamilyIcon(index)}
            </div>

            {/* Nombre */}
            <h3 className={`mb-2 text-lg font-semibold ${textColorClass}`}>
              {family.name}
            </h3>

            {/* Descripción (si existe) */}
            {family.description && (
              <p className="mb-3 text-sm text-gray-600 line-clamp-2">
                {family.description}
              </p>
            )}

            {/* Badge con contador */}
            <div className="mt-auto rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm">
              {family.productsCount} producto{family.productsCount !== 1 ? 's' : ''}
            </div>

            {/* Efecto hover sutil */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
          </button>
        );
      })}
    </div>
  );
}

