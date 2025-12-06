import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateArticleStoreSchema = z.object({
  price: z.number().positive('El precio debe ser positivo').optional().nullable(),
  available: z.boolean().optional(),
});

async function hasAccessToArticle(
  userId: string,
  articleId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    return { hasAccess: false, isOwner: false };
  }

  const isOwner = article.createdById === userId;
  const isGeneral = article.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, isOwner };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; storeId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, storeId } = await params;
    const { hasAccess, isOwner } = await hasAccessToArticle(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede modificar
    if (!isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este artículo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateArticleStoreSchema.parse(body);

    // Verificar que la relación existe
    const articleStore = await prisma.articleStore.findUnique({
      where: {
        articleId_storeId: {
          articleId: id,
          storeId,
        },
      },
    });

    if (!articleStore) {
      return NextResponse.json(
        { error: 'El artículo no está asociado a este comercio' },
        { status: 404 }
      );
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (validatedData.price !== undefined) {
      updateData.price = validatedData.price;
    }
    if (validatedData.available !== undefined) {
      updateData.available = validatedData.available;
    }

    // Actualizar lastCheckedAt si se modifica precio o disponibilidad
    if (validatedData.price !== undefined || validatedData.available !== undefined) {
      updateData.lastCheckedAt = new Date();
    }

    // Actualizar
    const updated = await prisma.articleStore.update({
      where: {
        articleId_storeId: {
          articleId: id,
          storeId,
        },
      },
      data: updateData,
      include: {
        article: {
          select: {
            id: true,
            name: true,
            brand: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        articleStore: {
          id: updated.id,
          article: updated.article,
          store: updated.store,
          price: updated.price,
          available: updated.available,
          lastCheckedAt: updated.lastCheckedAt,
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
    console.error('Error in PUT /api/articles/[id]/stores/[storeId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; storeId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, storeId } = await params;
    const { hasAccess, isOwner } = await hasAccessToArticle(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede modificar
    if (!isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este artículo' },
        { status: 403 }
      );
    }

    // Verificar que la relación existe
    const articleStore = await prisma.articleStore.findUnique({
      where: {
        articleId_storeId: {
          articleId: id,
          storeId,
        },
      },
    });

    if (!articleStore) {
      return NextResponse.json(
        { error: 'El artículo no está asociado a este comercio' },
        { status: 404 }
      );
    }

    // Eliminar relación
    await prisma.articleStore.delete({
      where: {
        articleId_storeId: {
          articleId: id,
          storeId,
        },
      },
    });

    return NextResponse.json(
      { message: 'Artículo eliminado del comercio correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/articles/[id]/stores/[storeId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}


