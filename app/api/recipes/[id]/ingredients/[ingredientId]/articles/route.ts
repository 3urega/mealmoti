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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ingredientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ingredientId } = await params;
    const { hasAccess } = await hasAccessToRecipe(user.id, id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener el ingrediente y su producto
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

    // Obtener artículos disponibles para este producto
    const articles = await prisma.article.findMany({
      where: {
        productId: ingredient.productId,
        OR: [
          { isGeneral: true },
          { createdById: user.id },
        ],
      },
      include: {
        stores: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          where: {
            available: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(
      {
        product: {
          id: ingredient.product.id,
          name: ingredient.product.name,
        },
        articles: articles.map((article) => ({
          id: article.id,
          name: article.name,
          brand: article.brand,
          variant: article.variant,
          suggestedPrice: article.suggestedPrice,
          stores: article.stores.map((as) => ({
            id: as.store.id,
            name: as.store.name,
            type: as.store.type,
            price: as.price,
          })),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      'Error in GET /api/recipes/[id]/ingredients/[ingredientId]/articles:',
      error
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

