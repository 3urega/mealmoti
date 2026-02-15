import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todas las familias accesibles al usuario
    const families = await prisma.productFamily.findMany({
      where: {
        OR: [
          { isGeneral: true },
          { createdById: user.id },
        ],
      },
      include: {
        subfamilies: {
          include: {
            varieties: {
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
            },
            _count: {
              select: {
                products: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
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

    // Formatear respuesta con estructura jerárquica
    const formattedFamilies = families.map((family) => ({
      id: family.id,
      name: family.name,
      description: family.description,
      isGeneral: family.isGeneral,
      productsCount: family._count.products,
      subfamilies: family.subfamilies.map((subfamily) => ({
        id: subfamily.id,
        name: subfamily.name,
        description: subfamily.description,
        familyId: subfamily.familyId,
        productsCount: subfamily._count.products,
        varieties: subfamily.varieties.map((variety) => ({
          id: variety.id,
          name: variety.name,
          subfamilyId: variety.subfamilyId,
          productsCount: variety._count.products,
        })),
      })),
    }));

    return NextResponse.json(
      {
        families: formattedFamilies,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/product-families/tree:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

