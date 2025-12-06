import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const shareListSchema = z.object({
  email: z.string().email(),
  canEdit: z.boolean().default(true),
});

async function isListOwner(userId: string, listId: string): Promise<boolean> {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });

  return list?.ownerId === userId;
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

    // Solo el owner puede compartir
    if (!(await isListOwner(user.id, id))) {
      return NextResponse.json(
        { error: 'Only owner can share list' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, canEdit } = shareListSchema.parse(body);

    // Buscar usuario por email
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // No se puede compartir consigo mismo
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot share with yourself' },
        { status: 400 }
      );
    }

    // Crear o actualizar share
    const share = await prisma.shoppingListShare.upsert({
      where: {
        shoppingListId_userId: {
          shoppingListId: id,
          userId: targetUser.id,
        },
      },
      update: {
        canEdit,
      },
      create: {
        shoppingListId: id,
        userId: targetUser.id,
        canEdit,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/lists/[id]/share:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}



