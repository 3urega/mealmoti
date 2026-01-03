import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { canCreatePublicItems, canManageCatalog } from '@/lib/auth';
import { z } from 'zod';

const createTagSchema = z.object({
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

    // Obtener total para paginación
    const total = await prisma.productTag.count({ where });

    // Obtener tags con conteo de productos
    const tags = await prisma.productTag.findMany({
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

    return NextResponse.json(
      {
        tags: tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          description: tag.description,
          isGeneral: tag.isGeneral,
          createdById: tag.createdById,
          productsCount: tag._count.products,
          createdAt: tag.createdAt,
        })),
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/product-tags:', error);
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
    const validatedData = createTagSchema.parse(body);

    // Verificar si el usuario puede crear tags públicos
    if (validatedData.isGeneral && !canCreatePublicItems(user.role)) {
      return NextResponse.json(
        {
          error: 'No tienes permiso para crear tags públicos. Solo puedes crear tags privados.',
          details: 'Los usuarios normales solo pueden crear tags para uso privado.',
        },
        { status: 403 }
      );
    }

    // Forzar isGeneral a false si el usuario no tiene permisos
    const finalIsGeneral = canCreatePublicItems(user.role)
      ? validatedData.isGeneral
      : false;

    // Verificar que no existe un tag con el mismo nombre y alcance
    // Para tags generales, createdById debe ser null
    // Para tags particulares, createdById debe ser el ID del usuario
    // Usamos findFirst porque createdById puede ser null en la restricción única
    const existingTag = await prisma.productTag.findFirst({
      where: {
        name: validatedData.name.trim(),
        isGeneral: finalIsGeneral,
        createdById: finalIsGeneral ? null : user.id,
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'Ya existe un tag con ese nombre' },
        { status: 400 }
      );
    }

    // Crear tag
    const tag = await prisma.productTag.create({
      data: {
        name: validatedData.name.trim(),
        description: validatedData.description?.trim() || null,
        isGeneral: finalIsGeneral,
        createdById: finalIsGeneral ? null : user.id,
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
        tag: {
          id: tag.id,
          name: tag.name,
          description: tag.description,
          isGeneral: tag.isGeneral,
          createdById: tag.createdById,
          productsCount: tag._count.products,
          createdAt: tag.createdAt,
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
    console.error('Error in POST /api/product-tags:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

