import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createStoreSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['supermarket', 'specialty', 'online', 'other']),
  address: z.string().optional(),
  isGeneral: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const general = searchParams.get('general');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtros
    const where: any = {
      OR: [
        { isGeneral: true },
        { createdById: user.id },
      ],
    };

    // Filtro por tipo
    if (type && ['supermarket', 'specialty', 'online', 'other'].includes(type)) {
      where.type = type;
    }

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
    const total = await prisma.store.count({ where });

    // Obtener comercios con conteo de artículos
    const stores = await prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        isGeneral: true,
        createdById: true,
        createdAt: true,
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

    // Formatear respuesta con articlesCount
    const formattedStores = stores.map((store: typeof stores[0]) => ({
      id: store.id,
      name: store.name,
      type: store.type,
      address: store.address,
      isGeneral: store.isGeneral,
      createdById: store.createdById,
      articlesCount: store._count.articles,
      createdAt: store.createdAt,
    }));

    return NextResponse.json(
      {
        stores: formattedStores,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/stores:', error);
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
    const validatedData = createStoreSchema.parse(body);

    // Crear comercio
    const store = await prisma.store.create({
      data: {
        name: validatedData.name.trim(),
        type: validatedData.type,
        address: validatedData.address?.trim() || null,
        isGeneral: validatedData.isGeneral,
        createdById: validatedData.isGeneral ? null : user.id,
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
        store: {
          id: store.id,
          name: store.name,
          type: store.type,
          address: store.address,
          isGeneral: store.isGeneral,
          createdById: store.createdById,
          articlesCount: store._count.articles,
          createdAt: store.createdAt,
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
    console.error('Error in POST /api/stores:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

