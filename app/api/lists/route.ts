import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createListSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  servings: z.number().int().positive().optional(),
  ingredientSelections: z.record(z.string(), z.object({
    articleId: z.string().min(1),
    quantity: z.number().positive().optional(),
    unit: z.string().optional(),
  })).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type'); // "private" | "shared" | "all" | "from-recipes"

    // Construir condiciones base según el tipo
    let whereConditions: any = {};

    if (type === 'private') {
      // Solo listas propias sin compartir
      whereConditions = {
        ownerId: user.id,
        shares: {
          none: {},
        },
      };
    } else if (type === 'shared') {
      // Solo listas compartidas (donde el usuario no es owner pero tiene share)
      whereConditions = {
        ownerId: { not: user.id },
        shares: {
          some: {
            userId: user.id,
          },
        },
      };
    } else if (type === 'from-recipes') {
      // Solo listas creadas desde recetas
      whereConditions = {
        OR: [
          { ownerId: user.id },
          {
            shares: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
        recipeId: {
          not: null,
        },
      };
    } else {
      // Todas las listas (propias y compartidas)
      whereConditions = {
        OR: [
          { ownerId: user.id },
          {
            shares: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      };
    }

    // Aplicar filtro de status si se proporciona
    if (status && ['draft', 'active', 'completed', 'archived'].includes(status)) {
      if (whereConditions.OR) {
        // Si ya hay OR, agregar status a cada condición
        whereConditions = {
          AND: [
            {
              OR: whereConditions.OR,
            },
            { status },
          ],
        };
      } else {
        // Si no hay OR, agregar status directamente
        whereConditions.status = status;
      }
    }

    // Obtener listas propias y compartidas
    const lists = await prisma.shoppingList.findMany({
      where: whereConditions,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          select: {
            id: true,
            checked: true,
          },
        },
        shares: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({ lists }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/lists:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

async function hasAccessToList(
  userId: string,
  listId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    include: {
      shares: {
        where: { userId },
      },
    },
  });

  if (!list) {
    return { hasAccess: false, isOwner: false };
  }

  const isOwner = list.ownerId === userId;
  const isShared = list.shares.length > 0;

  return { hasAccess: isOwner || isShared, isOwner };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('fromTemplate');
    const recipeId = searchParams.get('fromRecipe');

    const body = await request.json();
    const { name, description, servings, ingredientSelections } = createListSchema.parse(body);

    let templateItems: any[] = [];
    let recipeItems: any[] = [];

    // Si se proporciona recipeId, crear items desde receta
    if (recipeId) {
      // Verificar acceso a la receta
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
          ingredients: {
            include: {
              product: true,
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

      const isOwner = recipe.createdById === user.id;
      if (!recipe.isGeneral && !isOwner) {
        return NextResponse.json(
          { error: 'No tienes acceso a esta receta' },
          { status: 403 }
        );
      }

      // Validar que todos los ingredientes tienen artículo seleccionado
      if (!ingredientSelections) {
        return NextResponse.json(
          { error: 'Debes seleccionar artículos para todos los ingredientes' },
          { status: 400 }
        );
      }

      const recipeServings = servings || recipe.servings || 1;
      const baseServings = recipe.servings || 1;
      const multiplier = recipeServings / baseServings;

      for (const ingredient of recipe.ingredients) {
        const selection = ingredientSelections[ingredient.id];
        if (!selection || !selection.articleId) {
          return NextResponse.json(
            { error: `Debes seleccionar un artículo para: ${ingredient.product.name}` },
            { status: 400 }
          );
        }

        // Verificar que el artículo existe y es accesible
        const article = await prisma.article.findUnique({
          where: { id: selection.articleId },
        });

        if (!article) {
          return NextResponse.json(
            { error: `Artículo no encontrado: ${selection.articleId}` },
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

        recipeItems.push({
          articleId: selection.articleId,
          quantity: (selection.quantity || ingredient.quantity) * multiplier,
          unit: selection.unit || ingredient.unit,
          notes: ingredient.notes,
          addedById: user.id,
        });
      }
    }

    // Si se proporciona templateId, copiar items de la plantilla
    if (templateId) {
      const { hasAccess } = await hasAccessToList(user.id, templateId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Plantilla no encontrada o sin acceso' },
          { status: 404 }
        );
      }

      const template = await prisma.shoppingList.findUnique({
        where: { id: templateId },
        include: {
          items: {
            include: {
              article: true,
            },
          },
        },
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Plantilla no encontrada' },
          { status: 404 }
        );
      }

      if (!template.isTemplate) {
        return NextResponse.json(
          { error: 'La lista especificada no es una plantilla' },
          { status: 400 }
        );
      }

      templateItems = template.items;
    }

    // Crear la nueva lista
    const list = await prisma.shoppingList.create({
      data: {
        name,
        description,
        ownerId: user.id,
        templateId: templateId || null,
        recipeId: recipeId || null,
        status: 'draft',
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
        shares: true,
      },
    });

    // Si hay items de receta, crearlos
    if (recipeItems.length > 0) {
      await prisma.item.createMany({
        data: recipeItems.map((item) => ({
          articleId: item.articleId,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
          shoppingListId: list.id,
          addedById: item.addedById,
        })),
      });
    }

    // Si hay items de plantilla, copiarlos
    if (templateItems.length > 0) {
      await prisma.item.createMany({
        data: templateItems.map((item) => ({
          articleId: item.articleId,
          quantity: item.quantity,
          unit: item.unit,
          storeId: item.storeId,
          notes: item.notes,
          shoppingListId: list.id,
          addedById: user.id,
        })),
      });

      // Recargar la lista con los items
      const listWithItems = await prisma.shoppingList.findUnique({
        where: { id: list.id },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
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
          },
          shares: true,
        },
      });

      return NextResponse.json({ list: listWithItems }, { status: 201 });
    }

    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/lists:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}


