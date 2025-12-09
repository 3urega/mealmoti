import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateIngredientSchema = z.object({
  productId: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unitId: z.string().min(1).optional(),
  isOptional: z.boolean().optional(),
  notes: z.string().optional(),
  order: z.number().int().optional(),
});

async function hasAccessToRecipe(
  userId: string,
  recipeId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
  });

  if (!recipe) {
    return { hasAccess: false, isOwner: false };
  }

  const isOwner = recipe.createdById === userId;
  const hasAccess = recipe.isGeneral || isOwner;

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
    const { hasAccess, isOwner } = await hasAccessToRecipe(user.id, id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Solo el creador puede actualizar ingredientes' },
        { status: 403 }
      );
    }

    // Verificar que el ingrediente pertenece a la receta
    const ingredient = await prisma.recipeIngredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient || ingredient.recipeId !== id) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData = updateIngredientSchema.parse(body);

    // Si se actualiza el producto, verificar acceso
    if (updateData.productId) {
      const product = await prisma.product.findUnique({
        where: { id: updateData.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Producto no encontrado' },
          { status: 404 }
        );
      }

      if (!product.isGeneral && product.createdById !== user.id) {
        return NextResponse.json(
          { error: 'No tienes acceso a este producto' },
          { status: 403 }
        );
      }
    }

    const updatedIngredient = await prisma.recipeIngredient.update({
      where: { id: ingredientId },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        article: {
          select: {
            id: true,
            name: true,
            brand: true,
            variant: true,
            suggestedPrice: true,
          },
        },
        unitRelation: {
          select: {
            id: true,
            name: true,
            symbol: true,
          },
        },
      },
    });

    return NextResponse.json({ ingredient: updatedIngredient }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in PUT /api/recipes/[id]/ingredients/[ingredientId]:', error);
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
    const { hasAccess, isOwner } = await hasAccessToRecipe(user.id, id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Solo el creador puede eliminar ingredientes' },
        { status: 403 }
      );
    }

    // Verificar que el ingrediente pertenece a la receta
    const ingredient = await prisma.recipeIngredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient || ingredient.recipeId !== id) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      );
    }

    await prisma.recipeIngredient.delete({
      where: { id: ingredientId },
    });

    return NextResponse.json(
      { message: 'Ingrediente eliminado' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/recipes/[id]/ingredients/[ingredientId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

