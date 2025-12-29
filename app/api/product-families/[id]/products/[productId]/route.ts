import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

async function hasAccessToFamily(
  userId: string,
  familyId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; family: any }> {
  const family = await prisma.productFamily.findUnique({
    where: { id: familyId },
  });

  if (!family) {
    return { hasAccess: false, isOwner: false, family: null };
  }

  const isOwner = family.createdById === userId;
  const isGeneral = family.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, isOwner, family };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, productId } = await params;
    const { hasAccess, isOwner, family } = await hasAccessToFamily(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Familia no encontrada o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede remover productos
    if (!family.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para remover productos de esta familia' },
        { status: 403 }
      );
    }

    // Verificar que existe la relación
    const relation = await prisma.productProductFamily.findUnique({
      where: {
        productId_familyId: {
          productId,
          familyId: id,
        },
      },
    });

    if (!relation) {
      return NextResponse.json(
        { error: 'El producto no pertenece a esta familia' },
        { status: 404 }
      );
    }

    // Eliminar relación
    await prisma.productProductFamily.delete({
      where: {
        productId_familyId: {
          productId,
          familyId: id,
        },
      },
    });

    return NextResponse.json(
      { message: 'Producto removido de la familia correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/product-families/[id]/products/[productId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

