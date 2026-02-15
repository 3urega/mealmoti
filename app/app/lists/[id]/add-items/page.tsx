'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductSearchBar from '@/components/ProductSearchBar';
import FamilyTree from '@/components/FamilyTree';
import FamilyGrid from '@/components/FamilyGrid';
import SubfamilyGrid from '@/components/SubfamilyGrid';
import VarietyGrid from '@/components/VarietyGrid';
import ProductCard from '@/components/ProductCard';
import ArticleSelector from '@/components/ArticleSelector';

interface Family {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  productsCount: number;
  subfamilies: Subfamily[];
}

interface Subfamily {
  id: string;
  name: string;
  description?: string | null;
  familyId: string;
  productsCount: number;
  varieties: Variety[];
}

interface Variety {
  id: string;
  name: string;
  subfamilyId: string;
  productsCount: number;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  articlesCount: number;
}

type ViewMode =
  | 'families'
  | 'family-detail'
  | 'subfamily-detail'
  | 'variety-detail'
  | 'search-results';

export default function AddItemsPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  // Estado principal
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('families');
  const [searchQuery, setSearchQuery] = useState('');

  // Datos del árbol
  const [families, setFamilies] = useState<Family[]>([]);

  // Selección actual
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedSubfamilyId, setSelectedSubfamilyId] = useState<string | null>(
    null
  );
  const [selectedVarietyId, setSelectedVarietyId] = useState<string | null>(
    null
  );

  // Datos de la vista actual
  const [currentSubfamilies, setCurrentSubfamilies] = useState<Subfamily[]>([]);
  const [currentVarieties, setCurrentVarieties] = useState<Variety[]>([]);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [searchProducts, setSearchProducts] = useState<Product[]>([]);

  // Modal de artículo
  const [showArticleSelector, setShowArticleSelector] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Artículos ya agregados a la lista
  const [listArticleIds, setListArticleIds] = useState<Set<string>>(new Set());

  // Cargar árbol de familias y artículos de la lista al inicio
  useEffect(() => {
    fetchFamilyTree();
    fetchListItems();
  }, [listId]);

  const fetchListItems = async () => {
    try {
      const res = await fetch(`/api/lists/${listId}`);
      const data = await res.json();
      if (res.ok && data.list && data.list.items) {
        // Crear un Set con los IDs de los artículos ya agregados
        const articleIds = new Set(
          data.list.items.map((item: { articleId: string }) => item.articleId)
        );
        setListArticleIds(articleIds);
      }
    } catch (err) {
      console.error('Error fetching list items:', err);
    }
  };

  const fetchFamilyTree = async () => {
    try {
      const res = await fetch('/api/product-families/tree');
      const data = await res.json();
      if (res.ok) {
        setFamilies(data.families || []);
      }
    } catch (err) {
      console.error('Error fetching family tree:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manejar búsqueda
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query || query.trim().length < 3) {
      setSearchProducts([]);
      if (viewMode === 'search-results') {
        setViewMode('families');
      }
      return;
    }

    setViewMode('search-results');
    try {
      const res = await fetch(
        `/api/products?search=${encodeURIComponent(query)}&limit=100`
      );
      const data = await res.json();
      if (res.ok) {
        setSearchProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error searching products:', err);
    }
  };

  // Manejar selección de familia
  const handleFamilySelect = async (familyId: string) => {
    setSelectedFamilyId(familyId);
    setSelectedSubfamilyId(null);
    setSelectedVarietyId(null);
    setViewMode('family-detail');

    try {
      const res = await fetch(`/api/products/by-family/${familyId}`);
      const data = await res.json();
      if (res.ok) {
        setCurrentSubfamilies(data.subfamilies || []);
        setCurrentProducts(data.products || []);
        setCurrentVarieties([]);
      }
    } catch (err) {
      console.error('Error fetching family data:', err);
    }
  };

  // Manejar selección de subfamilia
  const handleSubfamilySelect = async (subfamilyId: string) => {
    setSelectedSubfamilyId(subfamilyId);
    setSelectedVarietyId(null);
    setViewMode('subfamily-detail');

    try {
      const res = await fetch(`/api/products/by-subfamily/${subfamilyId}`);
      const data = await res.json();
      if (res.ok) {
        setCurrentVarieties(data.varieties || []);
        setCurrentProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching subfamily data:', err);
    }
  };

  // Manejar selección de variedad
  const handleVarietySelect = async (varietyId: string) => {
    setSelectedVarietyId(varietyId);
    setViewMode('variety-detail');

    try {
      const res = await fetch(`/api/products/by-variety/${varietyId}`);
      const data = await res.json();
      if (res.ok) {
        setCurrentProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching variety data:', err);
    }
  };

  // Manejar clic en producto
  const handleProductClick = (productId: string, productName: string) => {
    setSelectedProduct({ id: productId, name: productName });
    setShowArticleSelector(true);
  };

  // Manejar éxito al agregar artículo
  const handleArticleAdded = async (articleId: string) => {
    // Agregar el artículo al Set de artículos ya agregados
    setListArticleIds(new Set([...listArticleIds, articleId]));
    // Refrescar la lista completa para mantener sincronización
    await fetchListItems();
  };

  // Renderizar contenido central según el modo de vista
  const renderCentralContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Cargando...</div>
        </div>
      );
    }

    switch (viewMode) {
      case 'search-results':
        return (
          <div>
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Resultados de búsqueda
              {searchQuery && (
                <span className="ml-2 text-lg font-normal text-gray-600">
                  para "{searchQuery}"
                </span>
              )}
            </h2>
            {searchProducts.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                <p className="text-gray-600">
                  No se encontraron productos para "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {searchProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={(id) => handleProductClick(id, product.name)}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'family-detail':
        return (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {families.find((f) => f.id === selectedFamilyId)?.name}
              </h2>
              <button
                onClick={() => {
                  setViewMode('families');
                  setSelectedFamilyId(null);
                  setSelectedSubfamilyId(null);
                  setSelectedVarietyId(null);
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Volver a familias
              </button>
            </div>

            {currentSubfamilies.length > 0 && (
              <SubfamilyGrid
                subfamilies={currentSubfamilies}
                onSubfamilyClick={handleSubfamilySelect}
              />
            )}

            {currentProducts.length > 0 && (
              <div>
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  Productos
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {currentProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={(id) => handleProductClick(id, product.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {currentSubfamilies.length === 0 &&
              currentProducts.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                  <p className="text-gray-600">
                    No hay productos en esta familia.
                  </p>
                </div>
              )}
          </div>
        );

      case 'subfamily-detail':
        return (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {currentSubfamilies.find(
                  (s) => s.id === selectedSubfamilyId
                )?.name || 'Subfamilia'}
              </h2>
              <button
                onClick={() => {
                  if (selectedFamilyId) {
                    handleFamilySelect(selectedFamilyId);
                  } else {
                    setViewMode('families');
                    setSelectedSubfamilyId(null);
                  }
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Volver
              </button>
            </div>

            {currentVarieties.length > 0 && (
              <VarietyGrid
                varieties={currentVarieties}
                onVarietyClick={handleVarietySelect}
              />
            )}

            {currentProducts.length > 0 && (
              <div>
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  Productos
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {currentProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={(id) => handleProductClick(id, product.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {currentVarieties.length === 0 &&
              currentProducts.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                  <p className="text-gray-600">
                    No hay productos en esta subfamilia.
                  </p>
                </div>
              )}
          </div>
        );

      case 'variety-detail':
        return (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {currentVarieties.find((v) => v.id === selectedVarietyId)
                  ?.name || 'Variedad'}
              </h2>
              <button
                onClick={() => {
                  if (selectedSubfamilyId) {
                    handleSubfamilySelect(selectedSubfamilyId);
                  } else {
                    setViewMode('families');
                    setSelectedVarietyId(null);
                  }
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Volver
              </button>
            </div>

            {currentProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {currentProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={(id) => handleProductClick(id, product.name)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                <p className="text-gray-600">
                  No hay productos en esta variedad.
                </p>
              </div>
            )}
          </div>
        );

      case 'families':
      default:
        return (
          <div>
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Familias de Productos
            </h2>
            <FamilyGrid
              families={families}
              onFamilyClick={handleFamilySelect}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Agregar Artículos
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Navega por categorías o busca productos
              </p>
            </div>
            <button
              onClick={() => router.push(`/app/lists/${listId}`)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Volver a Lista
            </button>
          </div>

          {/* Buscador */}
          <div className="max-w-2xl">
            <ProductSearchBar onSearch={handleSearch} />
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <FamilyTree
                families={families}
                selectedFamilyId={selectedFamilyId}
                selectedSubfamilyId={selectedSubfamilyId}
                selectedVarietyId={selectedVarietyId}
                onFamilySelect={handleFamilySelect}
                onSubfamilySelect={handleSubfamilySelect}
                onVarietySelect={handleVarietySelect}
              />
            </div>
          </div>

          {/* Área central */}
          <div className="lg:col-span-3">{renderCentralContent()}</div>
        </div>
      </div>

      {/* Modal de selector de artículos */}
      {showArticleSelector && selectedProduct && (
        <ArticleSelector
          isOpen={showArticleSelector}
          onClose={() => {
            setShowArticleSelector(false);
            setSelectedProduct(null);
          }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          listId={listId}
          listArticleIds={listArticleIds}
          onSuccess={handleArticleAdded}
        />
      )}
    </div>
  );
}

