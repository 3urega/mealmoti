import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

async function hasAccessToArticle(
  userId: string,
  articleId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; article: any }> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    return { hasAccess: false, isOwner: false, article: null };
  }

  const isOwner = article.createdById === userId;
  const isGeneral = article.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, isOwner, article };
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
    const { hasAccess, isOwner, article } = await hasAccessToArticle(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede modificar ingredientes
    if (!article.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este artículo' },
        { status: 403 }
      );
    }

    // Verificar que el artículo tenga un producto asociado
    if (!article.productId) {
      return NextResponse.json(
        { error: 'El artículo no tiene un producto asociado' },
        { status: 400 }
      );
    }

    // Obtener los ingredientes del producto asociado
    const productIngredients = await prisma.productIngredient.findMany({
      where: { productId: article.productId },
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

    if (productIngredients.length === 0) {
      return NextResponse.json(
        {
          message: 'El producto no tiene ingredientes asignados',
          importedCount: 0,
          ingredients: [],
        },
        { status: 200 }
      );
    }

    // Obtener los ingredientes ya asignados al artículo para evitar duplicados
    const existingArticleIngredients = await prisma.articleIngredient.findMany({
      where: { articleId: id },
      select: { ingredientId: true },
    });

    const existingIngredientIds = new Set(
      existingArticleIngredients.map((ai) => ai.ingredientId)
    );

    // Filtrar ingredientes que aún no están asignados al artículo
    const ingredientsToImport = productIngredients.filter(
      (pi) => !existingIngredientIds.has(pi.ingredient.id)
    );

    if (ingredientsToImport.length === 0) {
      return NextResponse.json(
        {
          message: 'Todos los ingredientes del producto ya están asignados al artículo',
          importedCount: 0,
          ingredients: [],
        },
        { status: 200 }
      );
    }

    // Crear las relaciones ArticleIngredient
    const importedIngredients = await Promise.all(
      ingredientsToImport.map(async (pi) => {
        return await prisma.articleIngredient.create({
          data: {
            articleId: id,
            ingredientId: pi.ingredient.id,
            isOptional: pi.isOptional, // Respeta el flag isOptional del producto
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
      })
    );

    return NextResponse.json(
      {
        message: `Se importaron ${importedIngredients.length} ingredientes correctamente`,
        importedCount: importedIngredients.length,
        ingredients: importedIngredients.map((ai) => ({
          id: ai.id,
          ingredient: ai.ingredient,
          isOptional: ai.isOptional,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      'Error in POST /api/articles/[id]/ingredients/import-from-product:',
      error
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

