import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { canCreatePublicItems } from '@/lib/auth';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  isGeneral: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const general = searchParams.get('general');
    const search = searchParams.get('search');
    const familyId = searchParams.get('familyId');
    const includeFamilies = searchParams.get('includeFamilies') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtros
    const where: any = {
      OR: [
        { isGeneral: true },
        { createdById: user.id },
      ],
    };

    // Filtro por general
    if (general === 'true') {
      where.OR = [{ isGeneral: true }];
    } else if (general === 'false') {
      where.OR = [{ createdById: user.id, isGeneral: false }];
    }

    // Búsqueda por nombre
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Filtro por familia
    if (familyId) {
      where.families = {
        some: {
          familyId: familyId,
        },
      };
    }

    // Obtener total para paginación
    const total = await prisma.product.count({ where });

    // Obtener productos con conteo de artículos y familias si se solicita
    const products = await prisma.product.findMany({
      where,
      include: includeFamilies
        ? {
            families: {
              include: {
                family: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    isGeneral: true,
                  },
                },
              },
            },
            _count: {
              select: {
                articles: true,
              },
            },
          }
        : {
            _count: {
              select: {
                articles: true,
              },
            },
          },
      orderBy: {
        name: 'asc',
      },
      take: limit,
      skip: offset,
    });

    // Formatear respuesta con articlesCount y familias si se incluyen
    const formattedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      isGeneral: product.isGeneral,
      createdById: product.createdById,
      articlesCount: product._count.articles,
      families: includeFamilies
        ? product.families?.map((ppf: any) => ({
            id: ppf.family.id,
            name: ppf.family.name,
            description: ppf.family.description,
            isGeneral: ppf.family.isGeneral,
          })) || []
        : undefined,
      createdAt: product.createdAt,
    }));

    return NextResponse.json(
      {
        products: formattedProducts,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    // Verificar si el usuario puede crear productos públicos
    if (validatedData.isGeneral && !canCreatePublicItems(user.role)) {
      return NextResponse.json(
        { 
          error: 'No tienes permiso para crear productos públicos. Solo puedes crear productos privados.',
          details: 'Los usuarios normales solo pueden crear productos para uso privado.'
        },
        { status: 403 }
      );
    }

    // Forzar isGeneral a false si el usuario no tiene permisos
    const finalIsGeneral = canCreatePublicItems(user.role) ? validatedData.isGeneral : false;

    // Crear producto
    const product = await prisma.product.create({
      data: {
        name: validatedData.name.trim(),
        description: validatedData.description?.trim() || null,
        isGeneral: finalIsGeneral,
        createdById: finalIsGeneral ? null : user.id,
      },
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          isGeneral: product.isGeneral,
          createdById: product.createdById,
          articlesCount: product._count.articles,
          createdAt: product.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/products:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

