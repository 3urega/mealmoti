import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateArticleIngredientSchema = z.object({
  isOptional: z.boolean(),
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
    const { hasAccess, isOwner } = await hasAccessToArticle(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede modificar
    if (!isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este artículo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateArticleIngredientSchema.parse(body);

    // Verificar que la relación existe
    const articleIngredient = await prisma.articleIngredient.findUnique({
      where: {
        articleId_ingredientId: {
          articleId: id,
          ingredientId,
        },
      },
    });

    if (!articleIngredient) {
      return NextResponse.json(
        { error: 'El ingrediente no está asociado a este artículo' },
        { status: 404 }
      );
    }

    // Actualizar
    const updated = await prisma.articleIngredient.update({
      where: {
        articleId_ingredientId: {
          articleId: id,
          ingredientId,
        },
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

    return NextResponse.json(
      {
        articleIngredient: {
          id: updated.id,
          ingredient: updated.ingredient,
          isOptional: updated.isOptional,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in PUT /api/articles/[id]/ingredients/[ingredientId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ingredientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ingredientId } = await params;
    const { hasAccess, isOwner } = await hasAccessToArticle(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede modificar
    if (!isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este artículo' },
        { status: 403 }
      );
    }

    // Verificar que la relación existe
    const articleIngredient = await prisma.articleIngredient.findUnique({
      where: {
        articleId_ingredientId: {
          articleId: id,
          ingredientId,
        },
      },
    });

    if (!articleIngredient) {
      return NextResponse.json(
        { error: 'El ingrediente no está asociado a este artículo' },
        { status: 404 }
      );
    }

    // Eliminar relación
    await prisma.articleIngredient.delete({
      where: {
        articleId_ingredientId: {
          articleId: id,
          ingredientId,
        },
      },
    });

    return NextResponse.json(
      { message: 'Ingrediente eliminado del artículo correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/articles/[id]/ingredients/[ingredientId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

