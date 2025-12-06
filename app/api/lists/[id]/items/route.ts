import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
  unit: z.string().optional(),
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
    const { name, quantity, unit, notes } = createItemSchema.parse(body);

    const item = await prisma.listItem.create({
      data: {
        name,
        quantity,
        unit,
        notes,
        shoppingListId: id,
        addedById: user.id,
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
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



