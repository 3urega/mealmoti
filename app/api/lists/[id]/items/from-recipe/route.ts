import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const addFromRecipeSchema = z.object({
  recipeId: z.string().min(1, 'El ID de la receta es requerido'),
  servings: z.number().int().positive().optional(),
  ingredientSelections: z.record(z.string(), z.object({
    articleId: z.string().min(1),
    quantity: z.number().positive().optional(),
    unitId: z.string().optional(),
  })).optional(),
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

    const { id: listId } = await params;
    const { hasAccess, canEdit } = await hasAccessToList(user.id, listId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar esta lista' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { recipeId, servings, ingredientSelections } = addFromRecipeSchema.parse(body);

    // Verificar acceso a la receta
    const { hasAccess: hasRecipeAccess } = await hasAccessToRecipe(
      user.id,
      recipeId
    );

    if (!hasRecipeAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta receta' },
        { status: 403 }
      );
    }

    // Obtener la receta con ingredientes y artículos asociados
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
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
            unit: {
              select: {
                id: true,
                name: true,
                symbol: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Receta no encontrada' },
        { status: 404 }
      );
    }

    // Usar selecciones manuales si existen, sino usar artículos preseleccionados
    const ingredientsToProcess = recipe.ingredients.filter((ingredient) => {
      const selection = ingredientSelections?.[ingredient.id];
      const articleIdToUse = selection?.articleId || ingredient.articleId;
      return !!articleIdToUse;
    });

    if (ingredientsToProcess.length === 0) {
      return NextResponse.json(
        {
          error: 'Debes seleccionar al menos un artículo para los ingredientes.',
        },
        { status: 400 }
      );
    }

    // Preparar lista de artículos a verificar (con selecciones manuales o preseleccionados)
    const articleIdsToCheck = ingredientsToProcess.map((ingredient) => {
      const selection = ingredientSelections?.[ingredient.id];
      return selection?.articleId || ingredient.articleId!;
    });

    // Obtener artículos que ya están en la lista
    const existingItems = await prisma.item.findMany({
      where: {
        shoppingListId: listId,
        articleId: {
          in: articleIdsToCheck,
        },
      },
      select: {
        articleId: true,
      },
    });

    const existingArticleIds = new Set(
      existingItems.map((item) => item.articleId)
    );

    // Filtrar ingredientes cuyos artículos no están ya en la lista
    const ingredientsToAdd = ingredientsToProcess.filter((ingredient) => {
      const selection = ingredientSelections?.[ingredient.id];
      const articleIdToUse = selection?.articleId || ingredient.articleId!;
      return !existingArticleIds.has(articleIdToUse);
    });

    if (ingredientsToAdd.length === 0) {
      return NextResponse.json(
        {
          message: 'Todos los artículos de la receta ya están en la lista',
          added: 0,
          skipped: ingredientsWithArticles.length,
        },
        { status: 200 }
      );
    }

    // Calcular multiplicador de porciones
    const recipeServings = servings || recipe.servings || 1;
    const baseServings = recipe.servings || 1;
    const multiplier = recipeServings / baseServings;

    // Verificar acceso a todos los artículos antes de crear
    for (const ingredient of ingredientsToAdd) {
      const selection = ingredientSelections?.[ingredient.id];
      const articleIdToUse = selection?.articleId || ingredient.articleId!;

      const article = await prisma.article.findUnique({
        where: { id: articleIdToUse },
      });

      if (!article) {
        return NextResponse.json(
          { error: `Artículo no encontrado: ${articleIdToUse}` },
          { status: 404 }
        );
      }

      if (!article.isGeneral && article.createdById !== user.id) {
        return NextResponse.json(
          { error: `No tienes acceso al artículo: ${article.name}` },
          { status: 403 }
        );
      }

      // Verificar que el artículo pertenece al producto del ingrediente
      if (article.productId !== ingredient.productId) {
        return NextResponse.json(
          { error: `El artículo ${article.name} no corresponde al producto ${ingredient.product.name}` },
          { status: 400 }
        );
      }
    }

    // Crear items para los ingredientes que no están en la lista
    // Primero obtener los artículos con sus precios
    const articleIdsToFetch = ingredientsToAdd.map((ingredient) => {
      const selection = ingredientSelections?.[ingredient.id];
      return selection?.articleId || ingredient.articleId!;
    });

    const articlesWithPrices = await prisma.article.findMany({
      where: {
        id: { in: articleIdsToFetch },
      },
      select: {
        id: true,
        suggestedPrice: true,
      },
    });

    const articlePriceMap = new Map(
      articlesWithPrices.map((a) => [a.id, a.suggestedPrice])
    );

    const itemsToCreate = await Promise.all(
      ingredientsToAdd.map(async (ingredient) => {
        const selection = ingredientSelections?.[ingredient.id];
        const articleIdToUse = selection?.articleId || ingredient.articleId!;
        const quantityToUse = (selection?.quantity || ingredient.quantity) * multiplier;
        const unitIdToUse = selection?.unitId || ingredient.unitId;

        // Obtener precio del artículo
        let itemPrice: number | null = articlePriceMap.get(articleIdToUse) || null;

        return {
          articleId: articleIdToUse,
          quantity: quantityToUse,
          unitId: unitIdToUse,
          price: itemPrice,
          notes: ingredient.notes,
          shoppingListId: listId,
          addedById: user.id,
        };
      })
    );

    const createdItems = await prisma.item.createMany({
      data: itemsToCreate,
    });

    // Obtener los items creados con toda su información
    const articleIdsAdded = itemsToCreate.map((item) => item.articleId);
    const newItems = await prisma.item.findMany({
      where: {
        shoppingListId: listId,
        articleId: {
          in: articleIdsAdded,
        },
        addedById: user.id,
        createdAt: {
          gte: new Date(Date.now() - 1000), // Items creados en el último segundo
        },
      },
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
        createdAt: 'desc',
      },
      take: createdItems.count,
    });

    // Actualizar el mensaje para incluir información sobre selecciones
    const skippedCount = existingItems.length;
    const addedCount = createdItems.count;

    return NextResponse.json(
      {
        message: `Se añadieron ${addedCount} artículos a la lista`,
        added: addedCount,
        skipped: skippedCount,
        items: newItems,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/lists/[id]/items/from-recipe:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

