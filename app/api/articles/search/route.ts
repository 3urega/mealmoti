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
    const excludeProductId = searchParams.get('excludeProductId'); // Para excluir artículos ya asociados a un producto específico
    const productId = searchParams.get('productId'); // Para filtrar por producto específico

    // Solo buscar si hay al menos 3 caracteres
    if (query.length < 3) {
      return NextResponse.json({ articles: [] }, { status: 200 });
    }

    // Búsqueda de artículos que el usuario tenga acceso (generales o propios)
    // Si excludeProductId está presente, solo buscar artículos sin producto asignado
    const where: any = {
      AND: [
        {
          OR: [
            { isGeneral: true },
            { createdById: user.id },
          ],
        },
      ],
    };

    // Filtrar por producto si se especifica productId
    if (productId) {
      where.productId = productId;
    } else if (excludeProductId) {
      // Solo filtrar por productId null si se especifica excludeProductId y no hay productId
      where.productId = null;
    }

    // Búsqueda por nombre o marca
    if (query) {
      where.AND.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
        ],
      });
    }

    const articles = await prisma.article.findMany({
      where,
      select: {
        id: true,
        name: true,
        brand: true,
        variant: true,
        suggestedPrice: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
    });

    // Formatear para el componente SearchableSelect
    const formattedArticles = articles.map((article) => ({
      id: article.id,
      name: `${article.name}${article.brand ? ` - ${article.brand}` : ''}${article.variant ? ` (${article.variant})` : ''}`,
      description: article.product ? `${article.product.name}${article.suggestedPrice ? ` - €${article.suggestedPrice.toFixed(2)}` : ''}` : (article.suggestedPrice ? `€${article.suggestedPrice.toFixed(2)}` : null),
    }));

    return NextResponse.json({ articles: formattedArticles }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/articles/search:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

