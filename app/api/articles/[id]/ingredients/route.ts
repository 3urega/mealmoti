import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assignIngredientsSchema = z.object({
  ingredientIds: z.array(z.string()).min(1, 'Debe incluir al menos un ingrediente'),
  isOptional: z.boolean().default(false),
});

async function hasAccessToArticle(
  userId: string,
  articleId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    return { hasAccess: false, isOwner: false };
  }

  const isOwner = article.createdById === userId;
  const isGeneral = article.isGeneral;
  const hasAccess = isGeneral || isOwner;

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

    const { id } = await params;
    const { hasAccess } = await hasAccessToArticle(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    const articleIngredients = await prisma.articleIngredient.findMany({
      where: { articleId: id },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
      },
      orderBy: {
        ingredient: {
          name: 'asc',
        },
      },
    });

    const ingredients = articleIngredients.map((ai) => ({
      id: ai.ingredient.id,
      name: ai.ingredient.name,
      type: ai.ingredient.type,
      description: ai.ingredient.description,
      isOptional: ai.isOptional,
    }));

    return NextResponse.json({ ingredients }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/articles/[id]/ingredients:', error);
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

    const { id } = await params;
    const { hasAccess, isOwner } = await hasAccessToArticle(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede modificar ingredientes
    if (!isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este artículo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = assignIngredientsSchema.parse(body);

    // Verificar que todos los ingredientes existen
    const ingredients = await prisma.ingredient.findMany({
      where: {
        id: {
          in: validatedData.ingredientIds,
        },
      },
    });

    if (ingredients.length !== validatedData.ingredientIds.length) {
      return NextResponse.json(
        { error: 'Uno o más ingredientes no existen' },
        { status: 400 }
      );
    }

    // Crear o actualizar relaciones
    const articleIngredients = await Promise.all(
      validatedData.ingredientIds.map(async (ingredientId) => {
        // Verificar si ya existe
        const existing = await prisma.articleIngredient.findUnique({
          where: {
            articleId_ingredientId: {
              articleId: id,
              ingredientId,
            },
          },
        });

        if (existing) {
          // Actualizar
          return await prisma.articleIngredient.update({
            where: {
              id: existing.id,
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
        } else {
          // Crear
          return await prisma.articleIngredient.create({
            data: {
              articleId: id,
              ingredientId,
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
        }
      })
    );

    return NextResponse.json(
      {
        articleIngredients: articleIngredients.map((ai) => ({
          id: ai.id,
          ingredient: ai.ingredient,
          isOptional: ai.isOptional,
        })),
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
    console.error('Error in POST /api/articles/[id]/ingredients:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

