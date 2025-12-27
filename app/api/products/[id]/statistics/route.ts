import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

async function hasAccessToProduct(
  userId: string,
  productId: string
): Promise<{ hasAccess: boolean; product: any }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return { hasAccess: false, product: null };
  }

  const isOwner = product.createdById === userId;
  const isGeneral = product.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, product };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: productId } = await params;
    const { hasAccess, product } = await hasAccessToProduct(user.id, productId);

    if (!hasAccess || !product) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const storeId = searchParams.get('storeId');
    const articleId = searchParams.get('articleId');

    // Construir filtros de fecha
    const startDate = startDateParam ? new Date(startDateParam) : null;
    const endDate = endDateParam ? new Date(endDateParam) : null;

    // Obtener todos los artículos del producto
    const articles = await prisma.article.findMany({
      where: {
        productId: productId,
      },
      select: {
        id: true,
      },
    });

    const articleIds = articles.map((a) => a.id);

    if (articleIds.length === 0) {
      // Producto sin artículos, retornar estructura vacía
      return NextResponse.json({
        product: { id: product.id, name: product.name },
        period: {
          startDate: startDate?.toISOString() || null,
          endDate: endDate?.toISOString() || null,
        },
        summary: {
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchase: null,
        },
        byStore: [],
        byArticle: [],
        timeline: [],
        priceDistribution: [],
        insights: {
          bestStore: null,
          bestArticle: null,
          priceTrend: 'stable' as const,
          bestMonth: null,
        },
      });
    }

    // Construir filtros para PurchaseItem
    const purchaseItemWhere: any = {
      articleId: { in: articleIds },
      purchase: {
        shoppingList: {
          OR: [
            { ownerId: user.id },
            {
              shares: {
                some: {
                  userId: user.id,
                },
              },
            },
          ],
        },
      },
    };

    // Filtrar por artículo si se especifica
    if (articleId) {
      purchaseItemWhere.articleId = articleId;
    }

    // Filtrar por tienda si se especifica
    if (storeId) {
      purchaseItemWhere.storeId = storeId;
    }

    // Filtrar por rango de fechas
    if (startDate || endDate) {
      purchaseItemWhere.purchase = {
        ...purchaseItemWhere.purchase,
        purchasedAt: {},
      };
      if (startDate) {
        purchaseItemWhere.purchase.purchasedAt.gte = startDate;
      }
      if (endDate) {
        purchaseItemWhere.purchase.purchasedAt.lte = endDate;
      }
    }

    // Obtener todos los PurchaseItems con sus relaciones
    const purchaseItems = await prisma.purchaseItem.findMany({
      where: purchaseItemWhere,
      include: {
        article: {
          select: {
            id: true,
            name: true,
            brand: true,
            variant: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        purchase: {
          select: {
            id: true,
            purchasedAt: true,
          },
        },
      },
      orderBy: {
        purchase: {
          purchasedAt: 'asc',
        },
      },
    });

    if (purchaseItems.length === 0) {
      return NextResponse.json({
        product: { id: product.id, name: product.name },
        period: {
          startDate: startDate?.toISOString() || null,
          endDate: endDate?.toISOString() || null,
        },
        summary: {
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchase: null,
        },
        byStore: [],
        byArticle: [],
        timeline: [],
        priceDistribution: [],
        insights: {
          bestStore: null,
          bestArticle: null,
          priceTrend: 'stable' as const,
          bestMonth: null,
        },
      });
    }

    // Calcular estadísticas generales
    const prices = purchaseItems.map((item) => item.price).filter((p) => p > 0);
    const averagePrice =
      prices.length > 0
        ? prices.reduce((sum, p) => sum + p, 0) / prices.length
        : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const totalSpent = purchaseItems.reduce(
      (sum, item) => sum + (item.subtotal || 0),
      0
    );
    const purchaseCount = purchaseItems.length;

    // Última compra
    const lastPurchaseItem = purchaseItems[purchaseItems.length - 1];
    const lastPurchase = lastPurchaseItem
      ? {
          date: lastPurchaseItem.purchase.purchasedAt.toISOString(),
          price: lastPurchaseItem.price,
          article: {
            id: lastPurchaseItem.article.id,
            name: lastPurchaseItem.article.name,
            brand: lastPurchaseItem.article.brand,
          },
        }
      : null;

    // Agrupar por tienda
    const storeMap = new Map<string, any>();
    purchaseItems.forEach((item) => {
      if (!item.storeId) return;
      const storeId = item.storeId;
      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          store: {
            id: item.store!.id,
            name: item.store!.name,
          },
          prices: [] as number[],
          purchaseCount: 0,
          totalSpent: 0,
        });
      }
      const storeData = storeMap.get(storeId);
      if (item.price > 0) {
        storeData.prices.push(item.price);
      }
      storeData.purchaseCount++;
      storeData.totalSpent += item.subtotal || 0;
    });

    const byStore = Array.from(storeMap.values()).map((data) => ({
      store: data.store,
      averagePrice:
        data.prices.length > 0
          ? data.prices.reduce((sum: number, p: number) => sum + p, 0) /
            data.prices.length
          : 0,
      purchaseCount: data.purchaseCount,
      totalSpent: data.totalSpent,
    }));

    // Agrupar por artículo
    const articleMap = new Map<string, any>();
    purchaseItems.forEach((item) => {
      const articleId = item.articleId;
      if (!articleMap.has(articleId)) {
        articleMap.set(articleId, {
          article: {
            id: item.article.id,
            name: item.article.name,
            brand: item.article.brand,
            variant: item.article.variant,
          },
          prices: [] as number[],
          purchaseCount: 0,
        });
      }
      const articleData = articleMap.get(articleId);
      if (item.price > 0) {
        articleData.prices.push(item.price);
      }
      articleData.purchaseCount++;
    });

    const byArticle = Array.from(articleMap.values()).map((data) => ({
      article: data.article,
      averagePrice:
        data.prices.length > 0
          ? data.prices.reduce((sum: number, p: number) => sum + p, 0) /
            data.prices.length
          : 0,
      minPrice: data.prices.length > 0 ? Math.min(...data.prices) : 0,
      maxPrice: data.prices.length > 0 ? Math.max(...data.prices) : 0,
      purchaseCount: data.purchaseCount,
    }));

    // Timeline (todas las compras ordenadas por fecha)
    const timeline = purchaseItems.map((item) => ({
      date: item.purchase.purchasedAt.toISOString(),
      price: item.price,
      article: {
        id: item.article.id,
        name: item.article.name,
        brand: item.article.brand,
      },
      store: item.store
        ? {
            id: item.store.id,
            name: item.store.name,
          }
        : null,
      quantity: item.purchasedQuantity,
    }));

    // Distribución de precios (histograma)
    const priceRanges: { [key: string]: number } = {};
    purchaseItems.forEach((item) => {
      if (item.price <= 0) return;
      const range = Math.floor(item.price / 5) * 5; // Agrupar en rangos de 5
      const rangeKey = `${range}-${range + 5}`;
      priceRanges[rangeKey] = (priceRanges[rangeKey] || 0) + 1;
    });

    const priceDistribution = Object.entries(priceRanges)
      .map(([range, count]) => ({
        range,
        count,
      }))
      .sort((a, b) => {
        const aStart = parseInt(a.range.split('-')[0]);
        const bStart = parseInt(b.range.split('-')[0]);
        return aStart - bStart;
      });

    // Insights
    const bestStore =
      byStore.length > 0
        ? byStore.reduce((best, current) =>
            current.averagePrice > 0 &&
            (best.averagePrice === 0 ||
              current.averagePrice < best.averagePrice)
              ? current
              : best
          )
        : null;

    const bestArticle =
      byArticle.length > 0
        ? byArticle.reduce((best, current) =>
            current.averagePrice > 0 &&
            (best.averagePrice === 0 ||
              current.averagePrice < best.averagePrice)
              ? current
              : best
          )
        : null;

    // Calcular tendencia de precios (comparar primera mitad vs segunda mitad)
    let priceTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (timeline.length >= 4) {
      const midPoint = Math.floor(timeline.length / 2);
      const firstHalf = timeline.slice(0, midPoint);
      const secondHalf = timeline.slice(midPoint);

      const firstHalfAvg =
        firstHalf.reduce((sum, item) => sum + item.price, 0) /
        firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, item) => sum + item.price, 0) /
        secondHalf.length;

      const diff = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      if (diff > 5) {
        priceTrend = 'increasing';
      } else if (diff < -5) {
        priceTrend = 'decreasing';
      }
    }

    // Mejor mes (mes con mejor precio promedio)
    const monthlyPrices: { [key: string]: number[] } = {};
    timeline.forEach((item) => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyPrices[monthKey]) {
        monthlyPrices[monthKey] = [];
      }
      monthlyPrices[monthKey].push(item.price);
    });

    let bestMonth: string | null = null;
    let bestMonthAvg = Infinity;
    Object.entries(monthlyPrices).forEach(([month, prices]) => {
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      if (avg < bestMonthAvg) {
        bestMonthAvg = avg;
        bestMonth = month;
      }
    });

    return NextResponse.json({
      product: { id: product.id, name: product.name },
      period: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
      },
      summary: {
        averagePrice: Math.round(averagePrice * 100) / 100,
        minPrice: Math.round(minPrice * 100) / 100,
        maxPrice: Math.round(maxPrice * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        purchaseCount,
        lastPurchase,
      },
      byStore: byStore.map((s) => ({
        ...s,
        averagePrice: Math.round(s.averagePrice * 100) / 100,
        totalSpent: Math.round(s.totalSpent * 100) / 100,
      })),
      byArticle: byArticle.map((a) => ({
        ...a,
        averagePrice: Math.round(a.averagePrice * 100) / 100,
        minPrice: Math.round(a.minPrice * 100) / 100,
        maxPrice: Math.round(a.maxPrice * 100) / 100,
      })),
      timeline,
      priceDistribution,
      insights: {
        bestStore: bestStore
          ? {
              id: bestStore.store.id,
              name: bestStore.store.name,
              averagePrice: Math.round(bestStore.averagePrice * 100) / 100,
            }
          : null,
        bestArticle: bestArticle
          ? {
              id: bestArticle.article.id,
              name: bestArticle.article.name,
              averagePrice: Math.round(bestArticle.averagePrice * 100) / 100,
            }
          : null,
        priceTrend,
        bestMonth,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/products/[id]/statistics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

