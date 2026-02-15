import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;

    // Verificar acceso a la familia
    const family = await prisma.productFamily.findUnique({
      where: { id: familyId },
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Familia no encontrada' },
        { status: 404 }
      );
    }

    const hasAccess =
      family.isGeneral || family.createdById === user.id;
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Sin acceso a esta familia' },
        { status: 403 }
      );
    }

    // Obtener subfamilias de esta familia
    const subfamilies = await prisma.productSubfamily.findMany({
      where: { familyId },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Obtener productos de esta familia
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { isGeneral: true },
          { createdById: user.id },
        ],
        families: {
          some: {
            familyId: familyId,
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
    const formattedSubfamilies = subfamilies.map((subfamily) => ({
      id: subfamily.id,
      name: subfamily.name,
      description: subfamily.description,
      familyId: subfamily.familyId,
      productsCount: subfamily._count.products,
    }));

    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      isGeneral: product.isGeneral,
      articlesCount: product._count.articles,
    }));

    return NextResponse.json(
      {
        family: {
          id: family.id,
          name: family.name,
          description: family.description,
          isGeneral: family.isGeneral,
        },
        subfamilies: formattedSubfamilies,
        products: formattedProducts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/products/by-family/[familyId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

