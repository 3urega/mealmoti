import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // Solo buscar si hay al menos 3 caracteres
    if (query.length < 3) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    // Búsqueda parcial en nombres de productos
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { isGeneral: true },
          { createdById: user.id },
        ],
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        isGeneral: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/products/search:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

