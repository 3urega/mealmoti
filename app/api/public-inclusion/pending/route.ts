import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { canReviewInclusionRequests } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validar que el usuario puede revisar solicitudes
    if (!canReviewInclusionRequests(user.role)) {
      return NextResponse.json(
        { error: 'No tienes permiso para revisar solicitudes' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('itemType');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtros
    const where: any = {
      status: 'pending',
    };

    if (itemType && ['product', 'article', 'ingredient'].includes(itemType)) {
      where.itemType = itemType;
    }

    // Obtener solicitudes pendientes
    const requests = await prisma.publicInclusionRequest.findMany({
      where,
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Obtener información del item para cada solicitud
    const requestsWithItems = await Promise.all(
      requests.map(async (req) => {
        let item: any = null;
        let itemName = '';

        if (req.itemType === 'product') {
          const product = await prisma.product.findUnique({
            where: { id: req.itemId },
            select: {
              id: true,
              name: true,
              description: true,
              isGeneral: true,
              createdById: true,
            },
          });
          item = product;
          itemName = product?.name || '';
        } else if (req.itemType === 'article') {
          const article = await prisma.article.findUnique({
            where: { id: req.itemId },
            select: {
              id: true,
              name: true,
              brand: true,
              variant: true,
              isGeneral: true,
              createdById: true,
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });
          item = article;
          itemName = article
            ? `${article.name} (${article.brand}${article.variant ? ` - ${article.variant}` : ''})`
            : '';
        } else if (req.itemType === 'ingredient') {
          const ingredient = await prisma.ingredient.findUnique({
            where: { id: req.itemId },
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
            },
          });
          item = ingredient;
          itemName = ingredient?.name || '';
        }

        return {
          id: req.id,
          itemType: req.itemType,
          itemId: req.itemId,
          itemName,
          item,
          status: req.status,
          createdAt: req.createdAt,
          requestedBy: req.requestedBy,
        };
      })
    );

    const total = await prisma.publicInclusionRequest.count({ where });

    return NextResponse.json(
      {
        requests: requestsWithItems,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/public-inclusion/pending:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

