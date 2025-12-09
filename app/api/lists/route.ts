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
    unitId: z.string().optional(),
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
    if (status && ['draft', 'active', 'completed', 'archived', 'periodica'].includes(status)) {
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
              article: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                },
              },
              // @ts-ignore - unitRelation existe pero TypeScript puede no reconocerlo si el cliente no está actualizado
              unitRelation: {
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

      const isOwner = recipe.createdById === user.id;
      if (!recipe.isGeneral && !isOwner) {
        return NextResponse.json(
          { error: 'No tienes acceso a esta receta' },
          { status: 403 }
        );
      }

      const recipeServings = servings || recipe.servings || 1;
      const baseServings = recipe.servings || 1;
      const multiplier = recipeServings / baseServings;

      for (const ingredient of recipe.ingredients) {
        // Usar selección manual si existe, sino usar artículo preseleccionado
        const selection = ingredientSelections?.[ingredient.id];
        const articleIdToUse = selection?.articleId || ingredient.articleId;

        if (!articleIdToUse) {
          return NextResponse.json(
            { error: `Debes seleccionar un artículo para: ${ingredient.product.name}` },
            { status: 400 }
          );
        }

        // Verificar que el artículo existe y es accesible
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

        recipeItems.push({
          articleId: articleIdToUse,
          quantity: (selection?.quantity || ingredient.quantity) * multiplier,
          unitId: selection?.unitId || ingredient.unitId,
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

    // Si hay items de receta, crearlos con precios
    if (recipeItems.length > 0) {
      // Obtener precios de los artículos
      const articleIds = recipeItems.map((item) => item.articleId);
      const articles = await prisma.article.findMany({
        where: { id: { in: articleIds } },
        select: { id: true, suggestedPrice: true },
      });
      const priceMap = new Map(
        articles.map((a) => [a.id, a.suggestedPrice])
      );

      await prisma.item.createMany({
        data: recipeItems.map((item: typeof recipeItems[0]) => ({
          articleId: item.articleId,
          quantity: item.quantity,
          unitId: item.unitId,
          price: priceMap.get(item.articleId) || null,
          notes: item.notes,
          shoppingListId: list.id,
          addedById: item.addedById,
        })),
      });
    }

    // Si hay items de plantilla, copiarlos con precios
    if (templateItems.length > 0) {
      // Obtener precios de ArticleStore para items con storeId, o suggestedPrice como fallback
      const itemsWithPrices = await Promise.all(
        templateItems.map(async (item) => {
          let itemPrice: number | null = null;

          if (item.storeId) {
            // Buscar precio en ArticleStore
            const articleStore = await prisma.articleStore.findUnique({
              where: {
                articleId_storeId: {
                  articleId: item.articleId,
                  storeId: item.storeId,
                },
              },
            });
            if (articleStore?.price) {
              itemPrice = articleStore.price;
            }
          }

          // Si no hay precio de tienda, usar suggestedPrice
          if (itemPrice === null && item.article?.suggestedPrice) {
            itemPrice = item.article.suggestedPrice;
          }

          return {
            articleId: item.articleId,
            quantity: item.quantity,
            unitId: item.unitId,
            storeId: item.storeId,
            price: itemPrice,
            notes: item.notes,
            shoppingListId: list.id,
            addedById: user.id,
          };
        })
      );

      await prisma.item.createMany({
        data: itemsWithPrices,
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
              unit: {
                select: {
                  id: true,
                  name: true,
                  symbol: true,
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
        { error: 'Invalid input', details: error.issues },
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


