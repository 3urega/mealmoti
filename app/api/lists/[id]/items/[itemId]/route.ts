import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  checked: z.boolean().optional(),
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;
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

    // Verificar que el item pertenece a la lista
    const item = await prisma.listItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.shoppingListId !== id) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData = updateItemSchema.parse(body);

    const updatedItem = await prisma.listItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ item: updatedItem }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error in PUT /api/lists/[id]/items/[itemId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;
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

    // Verificar que el item pertenece a la lista
    const item = await prisma.listItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.shoppingListId !== id) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.listItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/lists/[id]/items/[itemId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}



