import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateItemSchema = z.object({
  quantity: z.number().positive('La cantidad debe ser positiva').optional(),
  unit: z.string().optional(),
  checked: z.boolean().optional(),
  purchasedQuantity: z
    .number()
    .nonnegative('La cantidad comprada no puede ser negativa')
    .optional()
    .nullable(),
  price: z.number().positive('El precio debe ser positivo').optional().nullable(),
  purchasedAt: z.string().datetime().optional().nullable(),
  storeId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        article: true,
      },
    });

    if (!item || item.shoppingListId !== id) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData = updateItemSchema.parse(body);

    // Validar purchasedQuantity <= quantity
    if (
      updateData.purchasedQuantity !== undefined &&
      updateData.purchasedQuantity !== null
    ) {
      const quantityToCheck = updateData.quantity ?? item.quantity;
      if (updateData.purchasedQuantity > quantityToCheck) {
        return NextResponse.json(
          {
            error:
              'La cantidad comprada no puede ser mayor que la cantidad solicitada',
          },
          { status: 400 }
        );
      }
    }

    // Si se marca como comprado y no hay purchasedAt, establecerlo automáticamente
    if (updateData.checked === true && !updateData.purchasedAt) {
      updateData.purchasedAt = new Date().toISOString();
    }

    // Preparar datos para actualizar
    const dataToUpdate: any = {};
    if (updateData.quantity !== undefined) dataToUpdate.quantity = updateData.quantity;
    if (updateData.unit !== undefined) dataToUpdate.unit = updateData.unit;
    if (updateData.checked !== undefined) dataToUpdate.checked = updateData.checked;
    if (updateData.purchasedQuantity !== undefined)
      dataToUpdate.purchasedQuantity = updateData.purchasedQuantity;
    if (updateData.price !== undefined) dataToUpdate.price = updateData.price;
    if (updateData.purchasedAt !== undefined)
      dataToUpdate.purchasedAt = updateData.purchasedAt
        ? new Date(updateData.purchasedAt)
        : null;
    if (updateData.storeId !== undefined) dataToUpdate.storeId = updateData.storeId;
    if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: dataToUpdate,
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
      },
    });

    return NextResponse.json({ item: updatedItem }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
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
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item || item.shoppingListId !== id) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.item.delete({
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



