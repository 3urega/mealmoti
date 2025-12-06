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

async function hasAccessToStore(
  userId: string,
  storeId: string
): Promise<{ hasAccess: boolean }> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    return { hasAccess: false };
  }

  const isGeneral = store.isGeneral;
  const isOwner = store.createdById === userId;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess };
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

    const { id } = await params;
    const { hasAccess } = await hasAccessToProduct(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const general = searchParams.get('general');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verificar acceso al comercio si se proporciona storeId
    if (storeId) {
      const { hasAccess: hasStoreAccess } = await hasAccessToStore(
        user.id,
        storeId
      );
      if (!hasStoreAccess) {
        return NextResponse.json(
          { error: 'Comercio no encontrado o sin acceso' },
          { status: 404 }
        );
      }
    }

    // Construir filtros base
    const where: any = {
      productId: id,
    };

    // Construir condiciones de visibilidad
    let visibilityCondition: any;
    if (general === 'true') {
      visibilityCondition = { isGeneral: true };
    } else if (general === 'false') {
      visibilityCondition = { isGeneral: false, createdById: user.id };
    } else {
      // Por defecto: generales + particulares del usuario
      visibilityCondition = {
        OR: [
          { isGeneral: true },
          { createdById: user.id },
        ],
      };
    }

    // Construir condición de búsqueda
    let searchCondition: any = null;
    if (search) {
      searchCondition = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // Combinar condiciones
    if (searchCondition) {
      where.AND = [visibilityCondition, searchCondition];
    } else {
      Object.assign(where, visibilityCondition);
    }

    // Filtro por storeId (artículos disponibles en ese comercio)
    if (storeId) {
      where.stores = {
        some: {
          storeId: storeId,
        },
      };
    }

    // Obtener total para paginación
    const total = await prisma.article.count({ where });

    // Obtener artículos con información completa
    const articles = await prisma.article.findMany({
      where,
      include: {
        stores: {
          where: storeId
            ? {
                storeId: storeId,
              }
            : undefined,
          include: {
            store: {
              select: {
                id: true,
                name: true,
                type: true,
                address: true,
              },
            },
          },
          orderBy: {
            store: {
              name: 'asc',
            },
          },
        },
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                type: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
      skip: offset,
    });

    // Formatear respuesta
    const formattedArticles = articles.map((article) => ({
      id: article.id,
      name: article.name,
      brand: article.brand,
      variant: article.variant,
      suggestedPrice: article.suggestedPrice,
      isGeneral: article.isGeneral,
      createdById: article.createdById,
      stores: article.stores.map((as) => ({
        id: as.store.id,
        name: as.store.name,
        type: as.store.type,
        address: as.store.address,
        price: as.price,
        available: as.available,
        lastCheckedAt: as.lastCheckedAt,
      })),
      ingredients: article.ingredients.map((ai) => ({
        id: ai.ingredient.id,
        name: ai.ingredient.name,
        type: ai.ingredient.type,
        description: ai.ingredient.description,
        isOptional: ai.isOptional,
      })),
    }));

    return NextResponse.json(
      {
        articles: formattedArticles,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/products/[id]/articles:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

