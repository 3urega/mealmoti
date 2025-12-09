import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createItemSchema = z.object({
  articleId: z.string().min(1, 'El artículo es requerido'),
  quantity: z.number().positive('La cantidad debe ser positiva'),
  unitId: z.string().optional(),
  storeId: z.string().optional(),
  notes: z.string().optional(),
});

async function hasAccessToList(
  userId: string,
  listId: string
): Promise<{ hasAccess: boolean; canEdit: boolean }> {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    include: {
      shares: {
        where: { userId },
      },
    },
  });

  if (!list) {
    return { hasAccess: false, canEdit: false };
  }

  const isOwner = list.ownerId === userId;
  const share = list.shares[0];
  const canEdit = isOwner || (share?.canEdit ?? false);

  return { hasAccess: isOwner || share !== undefined, canEdit };
}

async function hasAccessToArticle(
  userId: string,
  articleId: string
): Promise<{ hasAccess: boolean; article: any }> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    return { hasAccess: false, article: null };
  }

  const isOwner = article.createdById === userId;
  const isGeneral = article.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, article };
}

async function hasAccessToStore(
  userId: string,
  storeId: string
): Promise<{ hasAccess: boolean }> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    return { hasAccess: false };
  }

  const isGeneral = store.isGeneral;
  const isOwner = store.createdById === userId;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { hasAccess, canEdit } = await hasAccessToList(user.id, id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this list' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { articleId, quantity, unitId, storeId, notes } =
      createItemSchema.parse(body);

    // Verificar acceso al artículo
    const { hasAccess: hasArticleAccess, article } =
      await hasAccessToArticle(user.id, articleId);
    if (!hasArticleAccess || !article) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Verificar acceso al comercio si se proporciona
    if (storeId) {
      const { hasAccess: hasStoreAccess } = await hasAccessToStore(
        user.id,
        storeId
      );
      if (!hasStoreAccess) {
        return NextResponse.json(
          { error: 'Comercio no encontrado o sin acceso' },
          { status: 404 }
        );
      }
    }

    // Verificar unique constraint (un artículo solo una vez por lista)
    const existingItem = await prisma.item.findUnique({
      where: {
        shoppingListId_articleId: {
          shoppingListId: id,
          articleId,
        },
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'Este artículo ya está en la lista' },
        { status: 400 }
      );
    }

    // Obtener unidad por defecto si no se especifica
    let finalUnitId = unitId;
    if (!finalUnitId) {
      const defaultUnit = await prisma.unit.findUnique({
        where: { symbol: 'un' },
      });
      if (!defaultUnit) {
        return NextResponse.json(
          { error: 'Unidad por defecto no encontrada' },
          { status: 500 }
        );
      }
      finalUnitId = defaultUnit.id;
    }

    const item = await prisma.item.create({
      data: {
        articleId,
        quantity,
        unitId: finalUnitId,
        storeId: storeId || null,
        notes: notes || null,
        shoppingListId: id,
        addedById: user.id,
      },
      include: {
        article: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        addedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            symbol: true,
          },
        },
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    // Manejar error de unique constraint de Prisma
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Este artículo ya está en la lista' },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/lists/[id]/items:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}



