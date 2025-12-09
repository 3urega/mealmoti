import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateArticleSchema = z.object({
  articleId: z.string().min(1).nullable(),
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

    // Solo el dueño de la receta privada puede modificar artículos
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Solo puedes modificar artículos en tus recetas privadas' },
        { status: 403 }
      );
    }

    // Verificar que la receta es privada (no general)
    const recipe = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Receta no encontrada' },
        { status: 404 }
      );
    }

    if (recipe.isGeneral) {
      return NextResponse.json(
        { error: 'No puedes modificar artículos en recetas públicas. Copia la receta primero.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { articleId } = updateArticleSchema.parse(body);

    // Obtener el ingrediente
    const ingredient = await prisma.recipeIngredient.findUnique({
      where: { id: ingredientId },
      include: {
        product: true,
      },
    });

    if (!ingredient || ingredient.recipeId !== id) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      );
    }

    // Si se proporciona un articleId, validar que existe y pertenece al producto
    if (articleId) {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
      });

      if (!article) {
        return NextResponse.json(
          { error: 'Artículo no encontrado' },
          { status: 404 }
        );
      }

      // Verificar acceso al artículo
      if (!article.isGeneral && article.createdById !== user.id) {
        return NextResponse.json(
          { error: 'No tienes acceso a este artículo' },
          { status: 403 }
        );
      }

      // Verificar que el artículo pertenece al producto del ingrediente
      if (article.productId !== ingredient.productId) {
        return NextResponse.json(
          { error: `El artículo no corresponde al producto ${ingredient.product.name}` },
          { status: 400 }
        );
      }
    }

    // Actualizar el ingrediente con el artículo
    const updatedIngredient = await prisma.recipeIngredient.update({
      where: { id: ingredientId },
      data: {
        articleId: articleId || null,
      },
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
            variant: true,
            suggestedPrice: true,
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
    console.error('Error in PUT /api/recipes/[id]/ingredients/[ingredientId]/article:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

