import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { canManageCatalog } from '@/lib/auth';
import { z } from 'zod';

const createProductFamilySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  isGeneral: z.boolean().default(false),
});

async function hasAccessToFamily(
  userId: string,
  familyId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; family: any }> {
  const family = await prisma.productFamily.findUnique({
    where: { id: familyId },
  });

  if (!family) {
    return { hasAccess: false, isOwner: false, family: null };
  }

  const isOwner = family.createdById === userId;
  const isGeneral = family.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, isOwner, family };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const general = searchParams.get('general');
    const search = searchParams.get('search');
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
      where.AND = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Obtener total para paginación
    const total = await prisma.productFamily.count({ where });

    // Obtener familias
    const families = await prisma.productFamily.findMany({
      where,
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
      take: limit,
      skip: offset,
    });

    // Formatear respuesta
    const formattedFamilies = families.map((family) => ({
      id: family.id,
      name: family.name,
      description: family.description,
      isGeneral: family.isGeneral,
      createdById: family.createdById,
      productsCount: family._count.products,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
    }));

    return NextResponse.json(
      {
        families: formattedFamilies,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/product-families:', error);
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
    const validatedData = createProductFamilySchema.parse(body);

    // Verificar que el nombre sea único para el usuario/general
    const existingFamily = await prisma.productFamily.findFirst({
      where: {
        name: validatedData.name.trim(),
        isGeneral: validatedData.isGeneral,
        createdById: validatedData.isGeneral ? null : user.id,
      },
    });

    if (existingFamily) {
      return NextResponse.json(
        { error: 'Ya existe una familia con ese nombre' },
        { status: 400 }
      );
    }

    // Crear familia
    const family = await prisma.productFamily.create({
      data: {
        name: validatedData.name.trim(),
        description: validatedData.description?.trim() || null,
        isGeneral: validatedData.isGeneral,
        createdById: validatedData.isGeneral ? null : user.id,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        family: {
          id: family.id,
          name: family.name,
          description: family.description,
          isGeneral: family.isGeneral,
          createdById: family.createdById,
          productsCount: family._count.products,
          createdAt: family.createdAt,
          updatedAt: family.updatedAt,
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
    console.error('Error in POST /api/product-families:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

