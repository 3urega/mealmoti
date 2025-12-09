import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z
    .enum(['draft', 'active', 'completed', 'archived', 'periodica'])
    .optional(),
  isTemplate: z.boolean().optional(),
});

async function hasAccessToList(
  userId: string,
  listId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    include: {
      shares: {
        where: { userId },
      },
    },
  });

  if (!list) {
    return { hasAccess: false, isOwner: false };
  }

  const isOwner = list.ownerId === userId;
  const isShared = list.shares.length > 0;

  return { hasAccess: isOwner || isShared, isOwner };
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
    const { hasAccess } = await hasAccessToList(user.id, id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const list = await prisma.shoppingList.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
          orderBy: {
            createdAt: 'asc',
          },
        },
        shares: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    return NextResponse.json({ list }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/lists/[id]:', error);
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
    const { hasAccess, isOwner } = await hasAccessToList(user.id, id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Solo el owner puede actualizar nombre, descripción, status e isTemplate
    const body = await request.json();
    const updateData = updateListSchema.parse(body);

    if (
      !isOwner &&
      (updateData.name ||
        updateData.description ||
        updateData.status !== undefined ||
        updateData.isTemplate !== undefined)
    ) {
      return NextResponse.json(
        { error: 'Only owner can update name, description, status and template' },
        { status: 403 }
      );
    }

    // Preparar datos para actualizar
    const dataToUpdate: any = {};
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.description !== undefined)
      dataToUpdate.description = updateData.description;
    if (updateData.isTemplate !== undefined)
      dataToUpdate.isTemplate = updateData.isTemplate;

    // Manejar cambio de status
    if (updateData.status !== undefined) {
      dataToUpdate.status = updateData.status;
      dataToUpdate.statusDate = new Date();

      // Si se marca como completada, calcular totalCost
      if (updateData.status === 'completed') {
        const items = await prisma.item.findMany({
          where: {
            shoppingListId: id,
            checked: true,
            price: { not: null },
            purchasedQuantity: { not: null },
          },
        });

        const totalCost = items.reduce((sum: number, item: { price: number | null; purchasedQuantity: number | null }) => {
          if (item.price && item.purchasedQuantity) {
            return sum + item.price * item.purchasedQuantity;
          }
          return sum;
        }, 0);

        dataToUpdate.totalCost = totalCost > 0 ? totalCost : null;
      } else {
        // Si cambia de completed a otro estado, limpiar totalCost
        const currentList = await prisma.shoppingList.findUnique({
          where: { id },
        });
        if (currentList?.status === 'completed') {
          dataToUpdate.totalCost = null;
        }
      }
    }

    const list = await prisma.shoppingList.update({
      where: { id },
      data: dataToUpdate,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        },
        shares: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ list }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in PUT /api/lists/[id]:', error);
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
    const { hasAccess, isOwner } = await hasAccessToList(user.id, id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Solo el owner puede eliminar
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only owner can delete list' },
        { status: 403 }
      );
    }

    await prisma.shoppingList.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/lists/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}


