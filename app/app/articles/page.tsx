'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArticleModal from '@/components/ArticleModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface Product {
  id: string;
  name: string;
}

interface Article {
  id: string;
  name: string;
  product: Product;
  brand: string;
  variant?: string | null;
  suggestedPrice?: number | null;
  isGeneral: boolean;
  createdById?: string | null;
  storesCount: number;
  createdAt: string;
}

interface ArticleListResponse {
  articles: Article[];
  total: number;
  limit: number;
  offset: number;
}

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [generalFilter, setGeneralFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState<Article | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [search, generalFilter, productFilter, brandFilter, offset]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products?limit=1000');
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }

      if (generalFilter !== 'all') {
        params.append('general', generalFilter === 'general' ? 'true' : 'false');
      }

      if (productFilter !== 'all') {
        params.append('productId', productFilter);
      }

      if (brandFilter.trim()) {
        params.append('brand', brandFilter.trim());
      }

      const res = await fetch(`/api/articles?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError((data as any).error || 'Error al cargar artículos');
        return;
      }

      const response = data as ArticleListResponse;
      setArticles(response.articles || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setOffset(0);
  };

  const handleGeneralFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setGeneralFilter(e.target.value);
    setOffset(0);
  };

  const handleProductFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setProductFilter(e.target.value);
    setOffset(0);
  };

  const handleBrandFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrandFilter(e.target.value);
    setOffset(0);
  };

  const handleCreateClick = () => {
    setEditingArticle(null);
    setShowModal(true);
  };

  const handleEditClick = (article: Article) => {
    setEditingArticle(article);
    setShowModal(true);
  };

  const handleDeleteClick = (article: Article) => {
    setDeletingArticle(article);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingArticle) return;

    setDeleteError('');
    try {
      const res = await fetch(`/api/articles/${deletingArticle.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Error al eliminar artículo');
        if (data.details) {
          setDeleteError(
            `${data.error}. Está asociado a ${data.details.items} items.`
          );
        }
        return;
      }

      setShowDeleteModal(false);
      setDeletingArticle(null);
      fetchArticles();
    } catch (err) {
      setDeleteError('Error de conexión');
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingArticle(null);
    fetchArticles();
  };

  const handleClearFilters = () => {
    setSearch('');
    setGeneralFilter('all');
    setProductFilter('all');
    setBrandFilter('');
    setOffset(0);
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const startItem = offset + 1;
  const endItem = Math.min(offset + limit, total);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Artículos</h1>
        <button
          onClick={handleCreateClick}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nuevo Artículo
        </button>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700"
            >
              Buscar por nombre/marca
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar artículo..."
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="generalFilter"
              className="block text-sm font-medium text-gray-700"
            >
              Filtrar por tipo
            </label>
            <select
              id="generalFilter"
              value={generalFilter}
              onChange={handleGeneralFilterChange}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="general">Generales</option>
              <option value="particular">Particulares</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="productFilter"
              className="block text-sm font-medium text-gray-700"
            >
              Filtrar por producto
            </label>
            <select
              id="productFilter"
              value={productFilter}
              onChange={handleProductFilterChange}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="brandFilter"
              className="block text-sm font-medium text-gray-700"
            >
              Filtrar por marca
            </label>
            <input
              id="brandFilter"
              type="text"
              value={brandFilter}
              onChange={handleBrandFilterChange}
              placeholder="Buscar marca..."
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleClearFilters}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Cargando artículos...</div>
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">
            {search || generalFilter !== 'all' || productFilter !== 'all' || brandFilter
              ? 'No se encontraron artículos con los filtros aplicados.'
              : 'No hay artículos todavía. Crea tu primer artículo para comenzar.'}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla de Artículos */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Marca
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Variante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Comercios
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      <button
                        onClick={() => router.push(`/app/articles/${article.id}`)}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {article.name}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {article.product.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {article.brand}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {article.variant || (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {article.suggestedPrice
                        ? `€${article.suggestedPrice.toFixed(2)}`
                        : (
                            <span className="text-gray-400">-</span>
                          )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          article.isGeneral
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {article.isGeneral ? 'General' : 'Particular'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {article.storesCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(article)}
                        className="mr-3 text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(article)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startItem}</span> a{' '}
                <span className="font-medium">{endItem}</span> de{' '}
                <span className="font-medium">{total}</span> artículos
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="flex items-center px-4 text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Crear/Editar */}
      <ArticleModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingArticle(null);
        }}
        article={editingArticle}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de Confirmar Eliminación */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingArticle(null);
          setDeleteError('');
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Artículo"
        message={`¿Estás seguro de que quieres eliminar el artículo "${deletingArticle?.name}"?`}
        itemName={deletingArticle?.name || ''}
        error={deleteError}
      />
    </div>
  );
}

