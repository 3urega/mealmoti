'use client';

import Link from 'next/link';

interface ProductFamily {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
}

interface ProductSubfamily {
  id: string;
  name: string;
  description?: string | null;
  familyId: string;
  family: {
    id: string;
    name: string;
    isGeneral: boolean;
  };
}

interface ProductVariety {
  id: string;
  name: string;
  subfamilyId: string;
  subfamily: {
    id: string;
    name: string;
    familyId: string;
    family: {
      id: string;
      name: string;
      isGeneral: boolean;
    };
  };
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
  articlesCount: number;
  families?: ProductFamily[];
  subfamilies?: ProductSubfamily[];
  varieties?: ProductVariety[];
  createdAt: string;
}

interface ProductGridProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductGrid({
  products,
  onEdit,
  onDelete,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-600">No hay productos para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          {/* Header con nombre y tipo */}
          <div className="mb-3">
            <Link
              href={`/app/products/${product.id}`}
              className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              {product.name}
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  product.isGeneral
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {product.isGeneral ? 'General' : 'Particular'}
              </span>
              <span className="text-xs text-gray-500">
                {product.articlesCount} artículo{product.articlesCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Descripción */}
          {product.description && (
            <p className="mb-3 line-clamp-2 text-sm text-gray-600">
              {product.description}
            </p>
          )}

          {/* Familias, Subfamilias y Variedades */}
          <div className="mb-4 flex-1 space-y-2">
            {/* Familias */}
            {product.families && product.families.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">
                  Familias:
                </div>
                <div className="flex flex-wrap gap-1">
                  {product.families.map((family) => (
                    <span
                      key={family.id}
                      className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
                      title={family.description || family.name}
                    >
                      {family.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Subfamilias */}
            {product.subfamilies && product.subfamilies.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">
                  Subfamilias:
                </div>
                <div className="flex flex-wrap gap-1">
                  {product.subfamilies.map((subfamily) => (
                    <span
                      key={subfamily.id}
                      className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                      title={`${subfamily.family.name} > ${subfamily.name}`}
                    >
                      {subfamily.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Variedades */}
            {product.varieties && product.varieties.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">
                  Variedades:
                </div>
                <div className="flex flex-wrap gap-1">
                  {product.varieties.map((variety) => (
                    <span
                      key={variety.id}
                      className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                      title={`${variety.subfamily.family.name} > ${variety.subfamily.name} > ${variety.name}`}
                    >
                      {variety.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje si no hay clasificaciones */}
            {(!product.families || product.families.length === 0) &&
              (!product.subfamilies || product.subfamilies.length === 0) &&
              (!product.varieties || product.varieties.length === 0) && (
                <p className="text-xs text-gray-400">
                  Sin clasificaciones asignadas
                </p>
              )}
          </div>

          {/* Acciones */}
          <div className="mt-auto flex gap-2 border-t border-gray-100 pt-3">
            <button
              onClick={() => onEdit(product)}
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(product)}
              className="flex-1 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

