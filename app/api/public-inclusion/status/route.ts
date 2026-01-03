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
    const itemType = searchParams.get('itemType');
    const itemId = searchParams.get('itemId');

    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: 'itemType e itemId son requeridos' },
        { status: 400 }
      );
    }

    if (!['product', 'article', 'ingredient'].includes(itemType)) {
      return NextResponse.json(
        { error: 'itemType debe ser product, article o ingredient' },
        { status: 400 }
      );
    }

    // Buscar la solicitud
    const inclusionRequest = await prisma.publicInclusionRequest.findUnique({
      where: {
        itemType_itemId: {
          itemType,
          itemId,
        },
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!inclusionRequest) {
      return NextResponse.json({ request: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        request: {
          id: inclusionRequest.id,
          itemType: inclusionRequest.itemType,
          itemId: inclusionRequest.itemId,
          status: inclusionRequest.status,
          notes: inclusionRequest.notes,
          createdAt: inclusionRequest.createdAt,
          reviewedAt: inclusionRequest.reviewedAt,
          requestedBy: inclusionRequest.requestedBy,
          reviewedBy: inclusionRequest.reviewedBy,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/public-inclusion/status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

