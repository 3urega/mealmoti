import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

async function isListOwner(userId: string, listId: string): Promise<boolean> {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });

  return list?.ownerId === userId;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = await params;

    // Solo el owner puede remover acceso
    if (!(await isListOwner(user.id, id))) {
      return NextResponse.json(
        { error: 'Only owner can remove access' },
        { status: 403 }
      );
    }

    await prisma.shoppingListShare.delete({
      where: {
        shoppingListId_userId: {
          shoppingListId: id,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/lists/[id]/share/[userId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}



