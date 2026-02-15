import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subfamilyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subfamilyId } = await params;

    // Verificar acceso a la subfamilia y obtener su familia
    const subfamily = await prisma.productSubfamily.findUnique({
      where: { id: subfamilyId },
      include: {
        family: true,
      },
    });

    if (!subfamily) {
      return NextResponse.json(
        { error: 'Subfamilia no encontrada' },
        { status: 404 }
      );
    }

    const hasAccess =
      subfamily.family.isGeneral || subfamily.family.createdById === user.id;
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Sin acceso a esta subfamilia' },
        { status: 403 }
      );
    }

    // Obtener variedades de esta subfamilia
    const varieties = await prisma.productVariety.findMany({
      where: { subfamilyId },
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

    // Obtener productos de esta subfamilia
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { isGeneral: true },
          { createdById: user.id },
        ],
        subfamilies: {
          some: {
            subfamilyId: subfamilyId,
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
    const formattedVarieties = varieties.map((variety) => ({
      id: variety.id,
      name: variety.name,
      subfamilyId: variety.subfamilyId,
      productsCount: variety._count.products,
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
        subfamily: {
          id: subfamily.id,
          name: subfamily.name,
          description: subfamily.description,
          familyId: subfamily.familyId,
          family: {
            id: subfamily.family.id,
            name: subfamily.family.name,
            isGeneral: subfamily.family.isGeneral,
          },
        },
        varieties: formattedVarieties,
        products: formattedProducts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/products/by-subfamily/[subfamilyId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

