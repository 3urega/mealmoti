import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSelectionSchema = z.object({
  name: z.string().optional(),
  items: z.array(
    z.object({
      recipeIngredientId: z.string(),
      articleId: z.string(),
    })
  ),
  setAsActive: z.boolean().optional().default(false),
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: recipeId } = await params;
    const { hasAccess } = await hasAccessToRecipe(user.id, recipeId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const selections = await prisma.recipeArticleSelection.findMany({
      where: { recipeId },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ selections }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/recipes/[id]/selections:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
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

    const { id: recipeId } = await params;
    const { hasAccess, isOwner } = await hasAccessToRecipe(user.id, recipeId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Solo el propietario puede crear selecciones' },
        { status: 403 }
      );
    }

    // Verificar que la receta existe y obtener sus ingredientes
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

    const body = await request.json();
    const { name, items, setAsActive } = createSelectionSchema.parse(body);

    // Validar que todos los ingredientes tienen artículo seleccionado
    const ingredientIds = recipe.ingredients.map((ing) => ing.id);
    const providedIngredientIds = items.map((item) => item.recipeIngredientId);

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

    // Validar que los artículos pertenecen a los productos correctos
    for (const item of items) {
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

    // Si se va a activar, desactivar las demás
    if (setAsActive) {
      await prisma.recipeArticleSelection.updateMany({
        where: { recipeId, isActive: true },
        data: { isActive: false },
      });
    }

    // Crear la selección con sus items
    const selection = await prisma.recipeArticleSelection.create({
      data: {
        recipeId,
        name: name || null,
        isActive: setAsActive || false,
        items: {
          create: items.map((item) => ({
            recipeIngredientId: item.recipeIngredientId,
            articleId: item.articleId,
          })),
        },
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

    return NextResponse.json({ selection }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/recipes/[id]/selections:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

