import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ varietyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { varietyId } = await params;

    // Verificar acceso a la variedad y obtener su subfamilia y familia
    const variety = await prisma.productVariety.findUnique({
      where: { id: varietyId },
      include: {
        subfamily: {
          include: {
            family: true,
          },
        },
      },
    });

    if (!variety) {
      return NextResponse.json(
        { error: 'Variedad no encontrada' },
        { status: 404 }
      );
    }

    const hasAccess =
      variety.subfamily.family.isGeneral ||
      variety.subfamily.family.createdById === user.id;
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Sin acceso a esta variedad' },
        { status: 403 }
      );
    }

    // Obtener productos de esta variedad
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { isGeneral: true },
          { createdById: user.id },
        ],
        varieties: {
          some: {
            varietyId: varietyId,
          },
        },
      },
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Formatear respuesta
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      isGeneral: product.isGeneral,
      articlesCount: product._count.articles,
    }));

    return NextResponse.json(
      {
        variety: {
          id: variety.id,
          name: variety.name,
          subfamilyId: variety.subfamilyId,
          subfamily: {
            id: variety.subfamily.id,
            name: variety.subfamily.name,
            familyId: variety.subfamily.familyId,
            family: {
              id: variety.subfamily.family.id,
              name: variety.subfamily.family.name,
              isGeneral: variety.subfamily.family.isGeneral,
            },
          },
        },
        products: formattedProducts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/products/by-variety/[varietyId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

