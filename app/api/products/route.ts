import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { canCreatePublicItems, canManageCatalog } from '@/lib/auth';
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
    const includeSubfamilies = searchParams.get('includeSubfamilies') === 'true';
    const includeVarieties = searchParams.get('includeVarieties') === 'true';
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

    // Construir objeto include dinámicamente
    const includeObj: any = {
      _count: {
        select: {
          articles: true,
        },
      },
    };

    if (includeFamilies) {
      includeObj.families = {
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
      };
    }

    if (includeSubfamilies) {
      includeObj.subfamilies = {
        include: {
          subfamily: {
            select: {
              id: true,
              name: true,
              description: true,
              familyId: true,
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
        orderBy: {
          subfamily: {
            name: 'asc',
          },
        },
      };
    }

    if (includeVarieties) {
      includeObj.varieties = {
        include: {
          variety: {
            select: {
              id: true,
              name: true,
              subfamilyId: true,
              subfamily: {
                select: {
                  id: true,
                  name: true,
                  familyId: true,
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
          },
        },
        orderBy: {
          variety: {
            name: 'asc',
          },
        },
      };
    }

    // Obtener productos con conteo de artículos y relaciones si se solicitan
    const products = await prisma.product.findMany({
      where,
      include: includeObj,
      orderBy: {
        name: 'asc',
      },
      take: limit,
      skip: offset,
    });

    // Formatear respuesta con articlesCount y relaciones si se incluyen
    const formattedProducts = products.map((product: any) => {
      const formatted: any = {
        id: product.id,
        name: product.name,
        description: product.description,
        isGeneral: product.isGeneral,
        createdById: product.createdById,
        articlesCount: product._count.articles,
        createdAt: product.createdAt,
      };

      if (includeFamilies && product.families) {
        formatted.families = product.families.map((ppf: any) => ({
          id: ppf.family.id,
          name: ppf.family.name,
          description: ppf.family.description,
          isGeneral: ppf.family.isGeneral,
        }));
      }

      if (includeSubfamilies && product.subfamilies) {
        formatted.subfamilies = product.subfamilies.map((pps: any) => ({
          id: pps.subfamily.id,
          name: pps.subfamily.name,
          description: pps.subfamily.description,
          familyId: pps.subfamily.familyId,
          family: {
            id: pps.subfamily.family.id,
            name: pps.subfamily.family.name,
            isGeneral: pps.subfamily.family.isGeneral,
          },
        }));
      }

      if (includeVarieties && product.varieties) {
        formatted.varieties = product.varieties.map((ppv: any) => ({
          id: ppv.variety.id,
          name: ppv.variety.name,
          subfamilyId: ppv.variety.subfamilyId,
          subfamily: {
            id: ppv.variety.subfamily.id,
            name: ppv.variety.subfamily.name,
            familyId: ppv.variety.subfamily.familyId,
            family: {
              id: ppv.variety.subfamily.family.id,
              name: ppv.variety.subfamily.family.name,
              isGeneral: ppv.variety.subfamily.family.isGeneral,
            },
          },
        }));
      }

      return formatted;
    });

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

    // Verificar permisos para gestionar catálogo
    if (!canManageCatalog(user.role)) {
      return NextResponse.json(
        {
          error: 'No tienes permisos para realizar esta acción',
          details: 'Solo usuarios con rol de gestión pueden crear/modificar/eliminar elementos del catálogo',
        },
        { status: 403 }
      );
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

