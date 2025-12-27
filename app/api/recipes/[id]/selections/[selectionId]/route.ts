import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSelectionSchema = z.object({
  name: z.string().optional(),
  items: z
    .array(
      z.object({
        recipeIngredientId: z.string(),
        articleId: z.string(),
      })
    )
    .optional(),
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

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; selectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: recipeId, selectionId } = await params;
    const { hasAccess } = await hasAccessToRecipe(user.id, recipeId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const selection = await prisma.recipeArticleSelection.findUnique({
      where: { id: selectionId },
      include: {
        items: {
          include: {
            recipeIngredient: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
        },
      },
    });

    if (!selection || selection.recipeId !== recipeId) {
      return NextResponse.json(
        { error: 'Selección no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ selection }, { status: 200 });
  } catch (error) {
    console.error(
      'Error in GET /api/recipes/[id]/selections/[selectionId]:',
      error
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; selectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: recipeId, selectionId } = await params;
    const { hasAccess, isOwner } = await hasAccessToRecipe(user.id, recipeId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Solo el propietario puede editar selecciones' },
        { status: 403 }
      );
    }

    const selection = await prisma.recipeArticleSelection.findUnique({
      where: { id: selectionId },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!selection || selection.recipeId !== recipeId) {
      return NextResponse.json(
        { error: 'Selección no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData = updateSelectionSchema.parse(body);

    // Si se actualizan los items, validar y reemplazar
    if (updateData.items) {
      const recipe = selection.recipe;
      const ingredientIds = recipe.ingredients.map((ing) => ing.id);
      const providedIngredientIds = updateData.items.map(
        (item) => item.recipeIngredientId
      );

      const missingIngredients = ingredientIds.filter(
        (id) => !providedIngredientIds.includes(id)
      );

      if (missingIngredients.length > 0) {
        return NextResponse.json(
          {
            error: `Faltan artículos para ${missingIngredients.length} ingrediente(s)`,
          },
          { status: 400 }
        );
      }

      // Validar artículos
      for (const item of updateData.items) {
        const ingredient = recipe.ingredients.find(
          (ing) => ing.id === item.recipeIngredientId
        );
        if (!ingredient) {
          return NextResponse.json(
            { error: `Ingrediente ${item.recipeIngredientId} no encontrado` },
            { status: 400 }
          );
        }

        const article = await prisma.article.findUnique({
          where: { id: item.articleId },
        });

        if (!article) {
          return NextResponse.json(
            { error: `Artículo ${item.articleId} no encontrado` },
            { status: 400 }
          );
        }

        if (article.productId !== ingredient.productId) {
          return NextResponse.json(
            {
              error: `El artículo ${article.name} no pertenece al producto ${ingredient.product.name}`,
            },
            { status: 400 }
          );
        }
      }

      // Eliminar items existentes y crear nuevos
      await prisma.recipeArticleSelectionItem.deleteMany({
        where: { selectionId },
      });

      await prisma.recipeArticleSelectionItem.createMany({
        data: updateData.items.map((item) => ({
          selectionId,
          recipeIngredientId: item.recipeIngredientId,
          articleId: item.articleId,
        })),
      });
    }

    // Actualizar nombre si se proporciona
    const updatedSelection = await prisma.recipeArticleSelection.update({
      where: { id: selectionId },
      data: {
        name: updateData.name !== undefined ? updateData.name : undefined,
      },
      include: {
        items: {
          include: {
            recipeIngredient: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
        },
      },
    });

    return NextResponse.json({ selection: updatedSelection }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error(
      'Error in PUT /api/recipes/[id]/selections/[selectionId]:',
      error
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; selectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: recipeId, selectionId } = await params;
    const { hasAccess, isOwner } = await hasAccessToRecipe(user.id, recipeId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Solo el propietario puede eliminar selecciones' },
        { status: 403 }
      );
    }

    const selection = await prisma.recipeArticleSelection.findUnique({
      where: { id: selectionId },
    });

    if (!selection || selection.recipeId !== recipeId) {
      return NextResponse.json(
        { error: 'Selección no encontrada' },
        { status: 404 }
      );
    }

    await prisma.recipeArticleSelection.delete({
      where: { id: selectionId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      'Error in DELETE /api/recipes/[id]/selections/[selectionId]:',
      error
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; selectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: recipeId, selectionId } = await params;
    const { hasAccess, isOwner } = await hasAccessToRecipe(user.id, recipeId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Solo el propietario puede activar selecciones' },
        { status: 403 }
      );
    }

    const selection = await prisma.recipeArticleSelection.findUnique({
      where: { id: selectionId },
    });

    if (!selection || selection.recipeId !== recipeId) {
      return NextResponse.json(
        { error: 'Selección no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { isActive } = z.object({ isActive: z.boolean() }).parse(body);

    // Si se activa, desactivar las demás
    if (isActive) {
      await prisma.recipeArticleSelection.updateMany({
        where: { recipeId, isActive: true },
        data: { isActive: false },
      });
    }

    const updatedSelection = await prisma.recipeArticleSelection.update({
      where: { id: selectionId },
      data: { isActive },
      include: {
        items: {
          include: {
            recipeIngredient: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
        },
      },
    });

    return NextResponse.json({ selection: updatedSelection }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error(
      'Error in PATCH /api/recipes/[id]/selections/[selectionId]:',
      error
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

