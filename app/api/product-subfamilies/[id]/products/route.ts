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

    // Verificar que la subfamilia existe
    const subfamily = await prisma.productSubfamily.findUnique({
      where: { id },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            isGeneral: true,
          },
        },
      },
    });

    if (!subfamily) {
      return NextResponse.json(
        { error: 'Subfamilia no encontrada' },
        { status: 404 }
      );
    }

    // Obtener productos de la subfamilia
    const productSubfamilies = await prisma.productProductSubfamily.findMany({
      where: { subfamilyId: id },
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

    const products = productSubfamilies.map((ps) => ps.product);

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/product-subfamilies/[id]/products:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

