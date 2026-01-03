import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get('userId'); // Para filtrar por usuario específico

    // Si el usuario es admin/superadmin, puede ver todas las compras o filtrar por usuario
    const isAdminUser = isAdmin(user.role);
    
    // Construir condiciones de filtro
    let whereCondition: any = {};

    if (isAdminUser) {
      // Admin puede ver todas las compras o filtrar por usuario específico
      if (filterUserId) {
        // Filtrar por usuario específico (sus listas propias o compartidas con él)
        whereCondition = {
          shoppingList: {
            OR: [
              { ownerId: filterUserId },
              {
                shares: {
                  some: {
                    userId: filterUserId,
                  },
                },
              },
            ],
          },
        };
      }
      // Si no hay filterUserId, ver todas las compras (no aplicar filtro)
    } else {
      // Usuario normal solo ve sus propias compras
      whereCondition = {
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
      };
    }

    // Obtener todas las compras según el filtro
    const purchases = await prisma.purchase.findMany({
      where: whereCondition,
      include: {
        items: {
          include: {
            article: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            store: {
              select: {
                id: true,
                name: true,
              },
            },
            unit: {
              select: {
                id: true,
                name: true,
                symbol: true,
              },
            },
          },
        },
        shoppingList: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        purchasedAt: 'desc',
      },
    });

    // Si no hay compras, retornar valores por defecto
    if (purchases.length === 0) {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      return NextResponse.json({
        stats: {
          totalSpent: 0,
          totalPurchases: 0,
          totalItems: 0,
          averagePurchaseValue: 0,
          period: {
            start: oneYearAgo.toISOString(),
            end: now.toISOString(),
          },
        },
        topItems: [],
        storeSpending: [],
        monthlySpending: [],
      });
    }

    // Calcular estadísticas básicas
    const totalSpent = purchases.reduce((sum, purchase) => {
      return sum + (purchase.totalPaid || 0);
    }, 0);

    const totalPurchases = purchases.length;

    const totalItems = purchases.reduce((sum, purchase) => {
      return sum + purchase.items.reduce((itemSum, item) => {
        return itemSum + item.purchasedQuantity;
      }, 0);
    }, 0);

    const averagePurchaseValue = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

    // Calcular rango de fechas
    const purchaseDates = purchases.map(p => p.purchasedAt).sort((a, b) => a.getTime() - b.getTime());
    const period = {
      start: purchaseDates[0].toISOString(),
      end: purchaseDates[purchaseDates.length - 1].toISOString(),
    };

    // Calcular topItems (agrupados por articleId)
    const itemsMap = new Map<string, {
      articleId: string;
      articleName: string;
      brand: string;
      totalQuantity: number;
      unit: string;
      totalSpent: number;
      purchaseCount: number;
    }>();

    purchases.forEach(purchase => {
      purchase.items.forEach(item => {
        const key = item.articleId;
        const existing = itemsMap.get(key);

        if (existing) {
          existing.totalQuantity += item.purchasedQuantity;
          existing.totalSpent += item.subtotal;
          existing.purchaseCount += 1;
        } else {
          itemsMap.set(key, {
            articleId: item.articleId,
            articleName: item.article.name,
            brand: item.article.brand || 'genérico',
            totalQuantity: item.purchasedQuantity,
            unit: item.unit?.symbol || 'un',
            totalSpent: item.subtotal,
            purchaseCount: 1,
          });
        }
      });
    });

    const topItems = Array.from(itemsMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10); // Top 10

    // Calcular storeSpending (agrupados por storeId)
    const storesMap = new Map<string, {
      storeId: string;
      storeName: string;
      totalSpent: number;
      purchaseCount: number;
      purchaseIds: Set<string>;
    }>();

    purchases.forEach(purchase => {
      purchase.items.forEach(item => {
        if (item.storeId && item.store) {
          const key = item.storeId;
          const existing = storesMap.get(key);

          if (existing) {
            existing.totalSpent += item.subtotal;
            existing.purchaseIds.add(purchase.id);
          } else {
            const purchaseIds = new Set<string>();
            purchaseIds.add(purchase.id);
            storesMap.set(key, {
              storeId: item.storeId,
              storeName: item.store.name,
              totalSpent: item.subtotal,
              purchaseCount: 1,
              purchaseIds,
            });
          }
        }
      });
    });

    // Convertir a array y calcular purchaseCount correcto
    const storeSpending = Array.from(storesMap.values()).map(store => {
      // Recalcular purchaseCount contando compras únicas
      const uniquePurchases = new Set<string>();
      purchases.forEach(purchase => {
        purchase.items.forEach(item => {
          if (item.storeId === store.storeId) {
            uniquePurchases.add(purchase.id);
          }
        });
      });

      return {
        storeId: store.storeId,
        storeName: store.storeName,
        totalSpent: store.totalSpent,
        purchaseCount: uniquePurchases.size,
        averagePurchaseValue: uniquePurchases.size > 0 ? store.totalSpent / uniquePurchases.size : 0,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    // Calcular monthlySpending (agrupados por mes/año)
    const monthsMap = new Map<string, {
      month: string;
      year: number;
      totalSpent: number;
      purchaseCount: number;
      purchaseIds: Set<string>;
    }>();

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    purchases.forEach(purchase => {
      const date = purchase.purchasedAt;
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = `${year}-${month}`;

      const existing = monthsMap.get(key);

      if (existing) {
        existing.totalSpent += purchase.totalPaid || 0;
        existing.purchaseIds.add(purchase.id);
      } else {
        const purchaseIds = new Set<string>();
        purchaseIds.add(purchase.id);
        monthsMap.set(key, {
          month: monthNames[month],
          year,
          totalSpent: purchase.totalPaid || 0,
          purchaseCount: 1,
          purchaseIds,
        });
      }
    });

    // Convertir a array y calcular purchaseCount correcto
    const monthlySpending = Array.from(monthsMap.values()).map(monthData => ({
      month: monthData.month,
      year: monthData.year,
      totalSpent: monthData.totalSpent,
      purchaseCount: monthData.purchaseIds.size,
    })).sort((a, b) => {
      // Ordenar por año y mes
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      const monthIndexA = monthNames.indexOf(a.month);
      const monthIndexB = monthNames.indexOf(b.month);
      return monthIndexA - monthIndexB;
    });

    // Obtener información del usuario filtrado si es admin y hay filtro
    let filteredUser = null;
    if (isAdminUser && filterUserId) {
      const userData = await prisma.user.findUnique({
        where: { id: filterUserId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
      filteredUser = userData;
    }

    return NextResponse.json({
      stats: {
        totalSpent,
        totalPurchases,
        totalItems,
        averagePurchaseValue,
        period,
      },
      topItems,
      storeSpending,
      monthlySpending,
      filteredUser, // Información del usuario si se está filtrando
      isAdminView: isAdminUser && !filterUserId, // Indica si se están viendo todos los usuarios
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard/stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

