import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateProductIngredientSchema = z.object({
  isOptional: z.boolean(),
});

async function hasAccessToProduct(
  userId: string,
  productId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return { hasAccess: false, isOwner: false };
  }

  const isOwner = product.createdById === userId;
  const isGeneral = product.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, isOwner };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ingredientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ingredientId } = await params;
    const { hasAccess, isOwner } = await hasAccessToProduct(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede modificar
    if (!isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este producto' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateProductIngredientSchema.parse(body);

    // Verificar que la relación existe
    const productIngredient = await prisma.productIngredient.findUnique({
      where: {
        productId_ingredientId: {
          productId: id,
          ingredientId,
        },
      },
    });

    if (!productIngredient) {
      return NextResponse.json(
        { error: 'El ingrediente no está asociado a este producto' },
        { status: 404 }
      );
    }

    // Actualizar
    const updated = await prisma.productIngredient.update({
      where: {
        productId_ingredientId: {
          productId: id,
          ingredientId,
        },
      },
      data: {
        isOptional: validatedData.isOptional,
      },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        productIngredient: {
          id: updated.id,
          ingredient: updated.ingredient,
          isOptional: updated.isOptional,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error in PUT /api/products/[id]/ingredients/[ingredientId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ingredientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ingredientId } = await params;
    const { hasAccess, isOwner } = await hasAccessToProduct(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede modificar
    if (!isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este producto' },
        { status: 403 }
      );
    }

    // Verificar que la relación existe
    const productIngredient = await prisma.productIngredient.findUnique({
      where: {
        productId_ingredientId: {
          productId: id,
          ingredientId,
        },
      },
    });

    if (!productIngredient) {
      return NextResponse.json(
        { error: 'El ingrediente no está asociado a este producto' },
        { status: 404 }
      );
    }

    // Eliminar relación
    await prisma.productIngredient.delete({
      where: {
        productId_ingredientId: {
          productId: id,
          ingredientId,
        },
      },
    });

    return NextResponse.json(
      { message: 'Ingrediente eliminado del producto correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]/ingredients/[ingredientId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

