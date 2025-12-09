import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updatePurchaseSchema = z.object({
  purchasedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        purchasedQuantity: z.number().positive().optional(),
        price: z.number().nonnegative().optional(),
        notes: z.string().optional().nullable(),
      })
    )
    .optional(),
});

async function hasAccessToPurchase(
  userId: string,
  purchaseId: string
): Promise<{ hasAccess: boolean; canEdit: boolean }> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      shoppingList: {
        include: {
          shares: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!purchase) {
    return { hasAccess: false, canEdit: false };
  }

  const list = purchase.shoppingList;
  const isOwner = list.ownerId === userId;
  const share = list.shares[0];
  const canEdit = isOwner || (share?.canEdit ?? false);

  return { hasAccess: isOwner || share !== undefined, canEdit };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseId } = await params;
    const { hasAccess } = await hasAccessToPurchase(user.id, purchaseId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: {
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
            unit: {
              select: {
                id: true,
                name: true,
                symbol: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        shoppingList: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ purchase }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/purchases/[purchaseId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseId } = await params;
    const { hasAccess, canEdit } = await hasAccessToPurchase(user.id, purchaseId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar esta compra' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData = updatePurchaseSchema.parse(body);

    // Preparar datos para actualizar Purchase
    const purchaseUpdateData: any = {};
    if (updateData.purchasedAt !== undefined) {
      purchaseUpdateData.purchasedAt = new Date(updateData.purchasedAt);
    }
    if (updateData.notes !== undefined) {
      purchaseUpdateData.notes = updateData.notes;
    }

    // Si hay items para actualizar, procesarlos
    if (updateData.items && updateData.items.length > 0) {
      // Actualizar cada PurchaseItem
      for (const itemUpdate of updateData.items) {
        const purchaseItem = await prisma.purchaseItem.findUnique({
          where: { id: itemUpdate.id },
        });

        if (!purchaseItem || purchaseItem.purchaseId !== purchaseId) {
          continue; // Saltar items que no pertenecen a esta compra
        }

        const updateItemData: any = {};
        if (itemUpdate.purchasedQuantity !== undefined) {
          updateItemData.purchasedQuantity = itemUpdate.purchasedQuantity;
        }
        if (itemUpdate.price !== undefined) {
          updateItemData.price = itemUpdate.price;
        }
        if (itemUpdate.notes !== undefined) {
          updateItemData.notes = itemUpdate.notes;
        }

        // Recalcular subtotal si se actualizó precio o cantidad
        if (
          itemUpdate.purchasedQuantity !== undefined ||
          itemUpdate.price !== undefined
        ) {
          const finalQty =
            itemUpdate.purchasedQuantity !== undefined
              ? itemUpdate.purchasedQuantity
              : purchaseItem.purchasedQuantity;
          const finalPrice =
            itemUpdate.price !== undefined ? itemUpdate.price : purchaseItem.price;
          updateItemData.subtotal = finalQty * finalPrice;
        }

        await prisma.purchaseItem.update({
          where: { id: itemUpdate.id },
          data: updateItemData,
        });
      }
    }

    // Recalcular total pagado sumando todos los subtotales (solo items con precio > 0)
    const allItems = await prisma.purchaseItem.findMany({
      where: { purchaseId },
    });
    const totalPaid = allItems.reduce((sum, item) => {
      return sum + (item.price > 0 ? item.subtotal : 0);
    }, 0);
    purchaseUpdateData.totalPaid = totalPaid > 0 ? totalPaid : null;

    // Actualizar Purchase
    const purchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: purchaseUpdateData,
      include: {
        items: {
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
            unit: {
              select: {
                id: true,
                name: true,
                symbol: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        shoppingList: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ purchase }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in PUT /api/purchases/[purchaseId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

