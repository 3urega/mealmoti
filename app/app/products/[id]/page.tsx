'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Article {
  id: string;
  name: string;
  brand: string;
  variant?: string | null;
  suggestedPrice?: number | null;
  isGeneral: boolean;
}

interface Ingredient {
  id: string;
  name: string;
  type: string;
  isOptional: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  createdById?: string | null;
  articles: Article[];
  ingredients: Ingredient[];
  articlesCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      if (res.ok) {
        setProduct(data.product);
      } else {
        setError(data.error || 'Error al cargar el producto');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {error || 'Producto no encontrado'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/app/products"
            className="mb-2 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Volver a Productos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          {product.description && (
            <p className="mt-2 text-gray-600">{product.description}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                product.isGeneral
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {product.isGeneral ? 'General' : 'Particular'}
            </span>
            <span>{product.articlesCount} artículos</span>
            <span>{product.ingredients.length} ingredientes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Artículos asociados */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Artículos ({product.articles.length})
            </h2>
            <Link
              href={`/app/articles?productId=${productId}`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Ver todos →
            </Link>
          </div>

          {product.articles.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay artículos asociados a este producto.
            </p>
          ) : (
            <ul className="space-y-2">
              {product.articles.map((article) => (
                <li
                  key={article.id}
                  className="rounded-md border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                >
                  <Link
                    href={`/app/articles/${article.id}`}
                    className="block"
                  >
                    <div className="font-medium text-gray-900">
                      {article.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                      <span>
                        {article.brand}
                        {article.variant && ` • ${article.variant}`}
                      </span>
                      {article.suggestedPrice && (
                        <span className="font-semibold text-gray-900">
                          €{article.suggestedPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Ingredientes */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Ingredientes ({product.ingredients.length})
          </h2>

          {product.ingredients.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay ingredientes asociados a este producto.
            </p>
          ) : (
            <ul className="space-y-2">
              {product.ingredients.map((ingredient) => (
                <li
                  key={ingredient.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {ingredient.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({ingredient.type})
                    </span>
                  </div>
                  {ingredient.isOptional && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                      Opcional
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

