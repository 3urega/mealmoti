import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

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
    const { hasAccess } = await hasAccessToStore(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Comercio no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const available = searchParams.get('available');
    const search = searchParams.get('search');

    // Construir filtros
    const where: any = {
      storeId: id,
    };

    // Filtro por disponibilidad
    if (available === 'true') {
      where.available = true;
    } else if (available === 'false') {
      where.available = false;
    }

    // Búsqueda por nombre o marca del artículo
    if (search) {
      where.article = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const articleStores = await prisma.articleStore.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            name: true,
            brand: true,
            variant: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        article: {
          name: 'asc',
        },
      },
    });

    const articles = articleStores.map((as) => ({
      id: as.article.id,
      name: as.article.name,
      brand: as.article.brand,
      variant: as.article.variant,
      product: as.article.product,
      price: as.price,
      available: as.available,
      lastCheckedAt: as.lastCheckedAt,
    }));

    return NextResponse.json({ articles }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/stores/[id]/articles:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}


