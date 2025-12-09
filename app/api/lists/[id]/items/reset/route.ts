import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listId } = await params;
    const { hasAccess, canEdit } = await hasAccessToList(user.id, listId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar esta lista' },
        { status: 403 }
      );
    }

    // Resetear todos los items de la lista
    const result = await prisma.item.updateMany({
      where: {
        shoppingListId: listId,
        checked: true, // Solo resetear los que están marcados
      },
      data: {
        checked: false,
        // Mantener el historial de compras (purchasedQuantity, price, purchasedAt)
        // para referencia futura, pero marcar como no comprado
      },
    });

    return NextResponse.json(
      {
        message: `Se resetearon ${result.count} artículos`,
        resetCount: result.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/lists/[id]/items/reset:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

