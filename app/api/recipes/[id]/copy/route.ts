import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

async function hasAccessToRecipe(
  userId: string,
  recipeId: string
): Promise<{ hasAccess: boolean }> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
  });

  if (!recipe) {
    return { hasAccess: false };
  }

  const isOwner = recipe.createdById === userId;
  const hasAccess = recipe.isGeneral || isOwner;

  return { hasAccess };
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
    const { hasAccess } = await hasAccessToRecipe(user.id, id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener la receta original con sus ingredientes
    const originalRecipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!originalRecipe) {
      return NextResponse.json(
        { error: 'Receta no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si el usuario ya tiene una copia de esta receta
    const existingCopy = await prisma.recipe.findFirst({
      where: {
        originalRecipeId: id,
        createdById: user.id,
      },
    });

    if (existingCopy) {
      return NextResponse.json(
        { error: 'Ya tienes una copia de esta receta', recipe: existingCopy },
        { status: 400 }
      );
    }

    // Crear la copia de la receta
    const copiedRecipe = await prisma.recipe.create({
      data: {
        name: originalRecipe.name,
        description: originalRecipe.description,
        instructions: originalRecipe.instructions,
        servings: originalRecipe.servings,
        prepTime: originalRecipe.prepTime,
        cookTime: originalRecipe.cookTime,
        isGeneral: false,
        createdById: user.id,
        originalRecipeId: id,
        ingredients: {
          create: originalRecipe.ingredients.map((ingredient) => ({
            productId: ingredient.productId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            isOptional: ingredient.isOptional,
            notes: ingredient.notes,
            order: ingredient.order,
            // No copiamos articleId - el usuario lo asignará después
          })),
        },
      },
      include: {
        ingredients: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            article: {
              select: {
                id: true,
                name: true,
                brand: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        originalRecipe: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ recipe: copiedRecipe }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/recipes/[id]/copy:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

