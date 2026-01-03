import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

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

    // Verificar que la variedad existe
    const variety = await prisma.productVariety.findUnique({
      where: { id },
      include: {
        subfamily: {
          include: {
            family: {
              select: {
                id: true,
                name: true,
                isGeneral: true,
              },
            },
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

    // Obtener productos de la variedad
    const productVarieties = await prisma.productProductVariety.findMany({
      where: { varietyId: id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            isGeneral: true,
            createdById: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const products = productVarieties.map((pv) => pv.product);

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/product-varieties/[id]/products:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

