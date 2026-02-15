'use client';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  articlesCount: number;
}

interface ProductCardProps {
  product: Product;
  onClick: (productId: string) => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <button
      onClick={() => onClick(product.id)}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-lg"
    >
      {/* Área de imagen/icono */}
      <div className="mb-4 flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-green-50 to-green-100">
        {/* Placeholder con icono de producto */}
        <svg
          className="h-16 w-16 text-green-600 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col">
        {/* Nombre del producto */}
        <h3 className="mb-2 text-left text-base font-semibold text-gray-900 group-hover:text-green-700">
          {product.name}
        </h3>

        {/* Descripción (si existe) */}
        {product.description && (
          <p className="mb-3 line-clamp-2 text-left text-sm text-gray-600">
            {product.description}
          </p>
        )}

        {/* Badge con contador de artículos */}
        <div className="mt-auto flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            {product.articlesCount} artículo{product.articlesCount !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-gray-500">
            {product.isGeneral ? 'General' : 'Particular'}
          </span>
        </div>

        {/* Botón de acción (visual) */}
        <div className="mt-3 flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Ver artículos
        </div>
      </div>
    </button>
  );
}

