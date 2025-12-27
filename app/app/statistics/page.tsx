'use client';

import { useEffect, useState, useCallback } from 'react';
import StatisticsCard from '@/components/StatisticsCard';
import PriceTimelineChart from '@/components/PriceTimelineChart';
import PriceComparisonChart from '@/components/PriceComparisonChart';
import PriceDistributionChart from '@/components/PriceDistributionChart';
import PurchasesTable from '@/components/PurchasesTable';

interface Product {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
}

interface Article {
  id: string;
  name: string;
  brand: string;
  variant?: string | null;
}

interface StatisticsData {
  product: { id: string; name: string };
  period: { startDate: string | null; endDate: string | null };
  summary: {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    totalSpent: number;
    purchaseCount: number;
    lastPurchase: {
      date: string;
      price: number;
      article: { id: string; name: string; brand: string };
    } | null;
  };
  byStore: Array<{
    store: { id: string; name: string };
    averagePrice: number;
    purchaseCount: number;
    totalSpent: number;
  }>;
  byArticle: Array<{
    article: { id: string; name: string; brand: string; variant?: string | null };
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    purchaseCount: number;
  }>;
  timeline: Array<{
    date: string;
    price: number;
    article: { id: string; name: string; brand: string };
    store: { id: string; name: string } | null;
    quantity: number;
  }>;
  priceDistribution: Array<{ range: string; count: number }>;
  insights: {
    bestStore: { id: string; name: string; averagePrice: number } | null;
    bestArticle: { id: string; name: string; averagePrice: number } | null;
    priceTrend: 'increasing' | 'decreasing' | 'stable';
    bestMonth: string | null;
  };
}

export default function StatisticsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [stores, setStores] = useState<Store[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Establecer fechas por defecto (últimos 6 meses)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Cargar productos
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?limit=1000');
        const data = await res.json();
        if (res.ok && data.products) {
          setProducts(data.products);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };
    fetchProducts();
  }, []);

  // Cargar tiendas
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/stores?limit=1000');
        const data = await res.json();
        if (res.ok && data.stores) {
          setStores(data.stores);
        }
      } catch (err) {
        console.error('Error fetching stores:', err);
      }
    };
    fetchStores();
  }, []);

  // Cargar artículos cuando se selecciona un producto
  useEffect(() => {
    if (!selectedProductId) {
      setArticles([]);
      return;
    }

    const fetchArticles = async () => {
      try {
        const res = await fetch(`/api/products/${selectedProductId}`);
        const data = await res.json();
        if (res.ok && data.product && data.product.articles) {
          setArticles(data.product.articles);
        }
      } catch (err) {
        console.error('Error fetching articles:', err);
      }
    };
    fetchArticles();
  }, [selectedProductId]);

  // Cargar estadísticas
  const fetchStatistics = useCallback(async () => {
    if (!selectedProductId) {
      setStatistics(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.append('endDate', end.toISOString());
      }
      if (selectedStoreId) params.append('storeId', selectedStoreId);
      if (selectedArticleId) params.append('articleId', selectedArticleId);

      const res = await fetch(`/api/products/${selectedProductId}/statistics?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar estadísticas');
        setStatistics(null);
        return;
      }

      setStatistics(data);
    } catch (err) {
      setError('Error de conexión');
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  }, [selectedProductId, startDate, endDate, selectedStoreId, selectedArticleId]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const handleClearFilters = () => {
    setSelectedStoreId('');
    setSelectedArticleId('');
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const formatCurrency = (value: number) => {
    return `${value.toFixed(2)} €`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return '📈';
      case 'decreasing':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'Subiendo';
      case 'decreasing':
        return 'Bajando';
      default:
        return 'Estable';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Estadísticas de Precios</h1>
        <p className="mt-2 text-sm text-gray-600">
          Analiza el historial de precios de tus productos y toma mejores decisiones de compra
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Filtros</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Producto *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="">Seleccionar producto...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fecha Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tienda
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="">Todas las tiendas</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Artículo
            </label>
            <select
              value={selectedArticleId}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              disabled={!selectedProductId}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Todos los artículos</option>
              {articles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.brand} {article.name} {article.variant || ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Cargando estadísticas...</div>
        </div>
      )}

      {/* Estadísticas */}
      {!loading && statistics && (
        <>
          {/* Tarjetas de Resumen */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatisticsCard
              title="Precio Promedio"
              value={formatCurrency(statistics.summary.averagePrice)}
              color="blue"
            />
            <StatisticsCard
              title="Precio Mínimo"
              value={formatCurrency(statistics.summary.minPrice)}
              subtitle="Mejor precio encontrado"
              color="green"
            />
            <StatisticsCard
              title="Precio Máximo"
              value={formatCurrency(statistics.summary.maxPrice)}
              subtitle="Precio más alto pagado"
              color="red"
            />
            <StatisticsCard
              title="Total Gastado"
              value={formatCurrency(statistics.summary.totalSpent)}
              color="purple"
            />
            <StatisticsCard
              title="Veces Comprado"
              value={statistics.summary.purchaseCount}
              subtitle={`${statistics.summary.purchaseCount === 1 ? 'vez' : 'veces'}`}
              color="yellow"
            />
            <StatisticsCard
              title="Última Compra"
              value={
                statistics.summary.lastPurchase
                  ? formatCurrency(statistics.summary.lastPurchase.price)
                  : 'N/A'
              }
              subtitle={
                statistics.summary.lastPurchase
                  ? new Date(statistics.summary.lastPurchase.date).toLocaleDateString('es-ES')
                  : 'Sin compras'
              }
              color="blue"
            />
          </div>

          {/* Gráfico de Evolución Temporal */}
          {statistics.timeline.length > 0 && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Evolución de Precios
              </h2>
              <PriceTimelineChart data={statistics.timeline} />
            </div>
          )}

          {/* Comparaciones */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Comparación por Tienda */}
            {statistics.byStore.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Comparación por Tienda
                </h2>
                <PriceComparisonChart
                  data={statistics.byStore.map((s) => ({
                    name: s.store.name,
                    averagePrice: s.averagePrice,
                    purchaseCount: s.purchaseCount,
                    totalSpent: s.totalSpent,
                  }))}
                  type="store"
                  showCount={true}
                />
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Tienda
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          Precio Prom.
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          Veces
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {statistics.byStore
                        .sort((a, b) => a.averagePrice - b.averagePrice)
                        .map((store, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {store.store.name}
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(store.averagePrice)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-gray-500">
                              {store.purchaseCount}
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-gray-500">
                              {formatCurrency(store.totalSpent)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Comparación por Artículo */}
            {statistics.byArticle.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Comparación por Artículo/Marca
                </h2>
                <PriceComparisonChart
                  data={statistics.byArticle.map((a) => ({
                    name: `${a.article.brand} ${a.article.name}${a.article.variant ? ` ${a.article.variant}` : ''}`,
                    averagePrice: a.averagePrice,
                    purchaseCount: a.purchaseCount,
                  }))}
                  type="article"
                  showCount={true}
                />
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Artículo
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          Prom.
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          Mín.
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          Máx.
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {statistics.byArticle
                        .sort((a, b) => a.averagePrice - b.averagePrice)
                        .map((article, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {article.article.brand} {article.article.name}
                              {article.article.variant && (
                                <span className="text-gray-500"> {article.article.variant}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(article.averagePrice)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-green-600">
                              {formatCurrency(article.minPrice)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-red-600">
                              {formatCurrency(article.maxPrice)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Distribución de Precios */}
          {statistics.priceDistribution.length > 0 && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Distribución de Precios
              </h2>
              <PriceDistributionChart data={statistics.priceDistribution} />
            </div>
          )}

          {/* Insights */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Insights y Recomendaciones</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {statistics.insights.bestStore && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="text-sm font-medium text-green-800">Mejor Tienda</p>
                  <p className="mt-1 text-lg font-bold text-green-900">
                    {statistics.insights.bestStore.name}
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    {formatCurrency(statistics.insights.bestStore.averagePrice)} promedio
                  </p>
                </div>
              )}
              {statistics.insights.bestArticle && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-sm font-medium text-blue-800">Mejor Artículo</p>
                  <p className="mt-1 text-lg font-bold text-blue-900">
                    {statistics.insights.bestArticle.name}
                  </p>
                  <p className="mt-1 text-sm text-blue-700">
                    {formatCurrency(statistics.insights.bestArticle.averagePrice)} promedio
                  </p>
                </div>
              )}
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                <p className="text-sm font-medium text-purple-800">Tendencia de Precios</p>
                <p className="mt-1 text-lg font-bold text-purple-900">
                  {getTrendIcon(statistics.insights.priceTrend)} {getTrendText(statistics.insights.priceTrend)}
                </p>
              </div>
              {statistics.insights.bestMonth && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                  <p className="text-sm font-medium text-yellow-800">Mejor Mes</p>
                  <p className="mt-1 text-lg font-bold text-yellow-900">
                    {new Date(statistics.insights.bestMonth + '-01').toLocaleDateString('es-ES', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Compras Detalladas */}
          {statistics.timeline.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Compras Detalladas
              </h2>
              <PurchasesTable data={statistics.timeline} />
            </div>
          )}
        </>
      )}

      {/* Estado inicial */}
      {!loading && !statistics && !error && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">
            Selecciona un producto para ver sus estadísticas de precios
          </p>
        </div>
      )}
    </div>
  );
}

