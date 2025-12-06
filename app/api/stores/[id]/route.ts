import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateStoreSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  type: z.enum(['supermarket', 'specialty', 'online', 'other']).optional(),
  address: z.string().optional().nullable(),
  isGeneral: z.boolean().optional(),
});

async function hasAccessToStore(
  userId: string,
  storeId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; store: any }> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    return { hasAccess: false, isOwner: false, store: null };
  }

  const isOwner = store.createdById === userId;
  const isGeneral = store.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, isOwner, store };
}

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
    const { hasAccess } = await hasAccessToStore(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Comercio no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Obtener comercio con artículos disponibles y precios
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        articles: {
          include: {
            article: {
              select: {
                id: true,
                name: true,
                brand: true,
                variant: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            articles: true,
            items: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Comercio no encontrado' },
        { status: 404 }
      );
    }

    // Formatear respuesta
    const formattedStore = {
      id: store.id,
      name: store.name,
      type: store.type,
      address: store.address,
      isGeneral: store.isGeneral,
      createdById: store.createdById,
      articles: store.articles.map((as: typeof store.articles[0]) => ({
        id: as.article.id,
        name: as.article.name,
        brand: as.article.brand,
        variant: as.article.variant,
        product: as.article.product,
        price: as.price,
        available: as.available,
        lastCheckedAt: as.lastCheckedAt,
      })),
      articlesCount: store._count.articles,
      itemsCount: store._count.items,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };

    return NextResponse.json({ store: formattedStore }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/stores/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { hasAccess, isOwner, store } = await hasAccessToStore(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Comercio no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede actualizar
    if (!store.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para actualizar este comercio' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateStoreSchema.parse(body);

    // Si se intenta cambiar isGeneral de true a false, validar que no tenga artículos generales
    if (
      validatedData.isGeneral === false &&
      store.isGeneral === true
    ) {
      const generalArticles = await prisma.articleStore.count({
        where: {
          storeId: id,
          article: {
            isGeneral: true,
          },
        },
      });

      if (generalArticles > 0) {
        return NextResponse.json(
          {
            error:
              'No se puede cambiar a particular porque tiene artículos generales asociados',
            details: {
              generalArticles,
            },
          },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name.trim();
    }
    if (validatedData.type !== undefined) {
      updateData.type = validatedData.type;
    }
    if (validatedData.address !== undefined) {
      updateData.address = validatedData.address?.trim() || null;
    }
    if (validatedData.isGeneral !== undefined) {
      updateData.isGeneral = validatedData.isGeneral;
      // Si cambia a particular, asignar createdById
      if (validatedData.isGeneral === false && store.isGeneral === true) {
        updateData.createdById = user.id;
      }
      // Si cambia a general, limpiar createdById
      if (validatedData.isGeneral === true && store.isGeneral === false) {
        updateData.createdById = null;
      }
    }

    // Actualizar comercio
    const updatedStore = await prisma.store.update({
      where: { id },
      data: updateData,
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
          id: updatedStore.id,
          name: updatedStore.name,
          type: updatedStore.type,
          address: updatedStore.address,
          isGeneral: updatedStore.isGeneral,
          createdById: updatedStore.createdById,
          articlesCount: updatedStore._count.articles,
          updatedAt: updatedStore.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in PUT /api/stores/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { hasAccess, isOwner, store } = await hasAccessToStore(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Comercio no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede eliminar
    if (!store.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este comercio' },
        { status: 403 }
      );
    }

    // Verificar si tiene artículos asociados (ArticleStore)
    const articlesCount = await prisma.articleStore.count({
      where: { storeId: id },
    });

    if (articlesCount > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar el comercio porque tiene artículos asociados',
          details: {
            articles: articlesCount,
          },
        },
        { status: 400 }
      );
    }

    // Verificar si tiene items asociados (Item)
    const itemsCount = await prisma.item.count({
      where: { storeId: id },
    });

    if (itemsCount > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar el comercio porque tiene items asociados',
          details: {
            items: itemsCount,
          },
        },
        { status: 400 }
      );
    }

    // Eliminar comercio
    await prisma.store.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Comercio eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/stores/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

