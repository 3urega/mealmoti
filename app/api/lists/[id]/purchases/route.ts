import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPurchaseSchema = z.object({
  purchasedAt: z.string().datetime().optional(),
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

    // Obtener items marcados como comprados
    const checkedItems = await prisma.item.findMany({
      where: {
        shoppingListId: listId,
        checked: true,
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
          },
        },
      },
    });

    if (checkedItems.length === 0) {
      return NextResponse.json(
        { error: 'No hay artículos marcados como comprados para registrar' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { purchasedAt, notes } = createPurchaseSchema.parse(body);

    // Crear PurchaseItems con datos de los items comprados
    const purchaseItemsData = checkedItems.map((item) => {
      const purchasedQty = item.purchasedQuantity || item.quantity;
      const price = item.price || 0;
      const subtotal = purchasedQty * price;

      return {
        itemId: item.id,
        articleId: item.articleId,
        quantity: item.quantity,
        purchasedQuantity: purchasedQty,
        unitId: item.unitId,
        price: price, // Puede ser 0 si no tiene precio, se puede editar después
        subtotal: subtotal,
        storeId: item.storeId,
        notes: item.notes,
      };
    });

    // Calcular total pagado (solo items con precio > 0)
    const totalPaid = purchaseItemsData.reduce((sum, item) => {
      return sum + (item.price > 0 ? item.subtotal : 0);
    }, 0);

    // Crear Purchase con sus items
    const purchase = await prisma.purchase.create({
      data: {
        shoppingListId: listId,
        totalPaid: totalPaid > 0 ? totalPaid : null,
        purchasedAt: purchasedAt ? new Date(purchasedAt) : new Date(),
        notes: notes || null,
        items: {
          create: purchaseItemsData,
        },
      },
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
      },
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/lists/[id]/purchases:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
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

    const { id: listId } = await params;
    const { hasAccess } = await hasAccessToList(user.id, listId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const purchases = await prisma.purchase.findMany({
      where: {
        shoppingListId: listId,
      },
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
      },
      orderBy: {
        purchasedAt: 'desc',
      },
    });

    return NextResponse.json({ purchases }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/lists/[id]/purchases:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

