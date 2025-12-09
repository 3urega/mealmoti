import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateArticleSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  productId: z.string().optional(),
  brand: z.string().min(1, 'La marca es requerida').optional(),
  variant: z.string().optional(),
  weightInGrams: z.number().positive('El peso debe ser positivo').optional().nullable(),
  suggestedPrice: z.number().positive('El precio debe ser positivo').optional().nullable(),
  isGeneral: z.boolean().optional(),
});

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

    // Obtener artículo con todas sus relaciones
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        ingredients: {
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
        },
        stores: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
                type: true,
                address: true,
              },
            },
          },
          orderBy: {
            store: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Formatear respuesta
    // Type assertion necesario porque el cliente de Prisma puede tener tipos cacheados
    const articleWithWeight = article as typeof article & { weightInGrams: number | null };
    
    const formattedArticle = {
      id: article.id,
      name: article.name,
      description: article.description,
      product: article.product,
      brand: article.brand,
      variant: article.variant,
      weightInGrams: articleWithWeight.weightInGrams ?? null,
      suggestedPrice: article.suggestedPrice,
      isGeneral: article.isGeneral,
      createdById: article.createdById,
      ingredients: article.ingredients.map((ai: typeof article.ingredients[0]) => ({
        id: ai.ingredient.id,
        name: ai.ingredient.name,
        type: ai.ingredient.type,
        description: ai.ingredient.description,
        isOptional: ai.isOptional,
      })),
      stores: article.stores.map((as: typeof article.stores[0]) => ({
        id: as.store.id,
        name: as.store.name,
        type: as.store.type,
        address: as.store.address,
        price: as.price,
        available: as.available,
        lastCheckedAt: as.lastCheckedAt,
      })),
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };

    return NextResponse.json({ article: formattedArticle }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { hasAccess, isOwner, article } = await hasAccessToArticle(
      user.id,
      id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede actualizar
    if (!article.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para actualizar este artículo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateArticleSchema.parse(body);

    // Si se intenta cambiar isGeneral de true a false, validar que no tenga items
    if (
      validatedData.isGeneral === false &&
      article.isGeneral === true
    ) {
      const itemsCount = await prisma.item.count({
        where: {
          articleId: id,
        },
      });

      if (itemsCount > 0) {
        return NextResponse.json(
          {
            error:
              'No se puede cambiar a particular porque tiene items asociados',
            details: {
              items: itemsCount,
            },
          },
          { status: 400 }
        );
      }
    }

    // Si se cambia el producto, validar acceso
    if (validatedData.productId && validatedData.productId !== article.productId) {
      const product = await prisma.product.findUnique({
        where: { id: validatedData.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Producto no encontrado' },
          { status: 400 }
        );
      }

      if (!product.isGeneral && product.createdById !== user.id) {
        return NextResponse.json(
          { error: 'No tienes acceso a este producto' },
          { status: 403 }
        );
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name.trim();
    }
    if (validatedData.productId !== undefined) {
      updateData.productId = validatedData.productId;
    }
    if (validatedData.brand !== undefined) {
      updateData.brand = validatedData.brand.trim() || 'genérico';
    }
    if (validatedData.variant !== undefined) {
      updateData.variant = validatedData.variant.trim() || null;
    }
    if (validatedData.weightInGrams !== undefined) {
      updateData.weightInGrams = validatedData.weightInGrams;
    }
    if (validatedData.suggestedPrice !== undefined) {
      updateData.suggestedPrice = validatedData.suggestedPrice;
    }
    if (validatedData.isGeneral !== undefined) {
      updateData.isGeneral = validatedData.isGeneral;
      // Si cambia a particular, asignar createdById
      if (validatedData.isGeneral === false && article.isGeneral === true) {
        updateData.createdById = user.id;
      }
      // Si cambia a general, limpiar createdById
      if (validatedData.isGeneral === true && article.isGeneral === false) {
        updateData.createdById = null;
      }
    }

    // Actualizar artículo
    const updatedArticle = await prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            stores: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        article: {
          id: updatedArticle.id,
          name: updatedArticle.name,
          product: updatedArticle.product,
          brand: updatedArticle.brand,
          variant: updatedArticle.variant,
          suggestedPrice: updatedArticle.suggestedPrice,
          isGeneral: updatedArticle.isGeneral,
          createdById: updatedArticle.createdById,
          storesCount: updatedArticle._count.stores,
          updatedAt: updatedArticle.updatedAt,
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
    console.error('Error in PUT /api/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { hasAccess, isOwner, article } = await hasAccessToArticle(
      user.id,
      id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede eliminar
    if (!article.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este artículo' },
        { status: 403 }
      );
    }

    // Verificar si tiene items asociados
    const itemsCount = await prisma.item.count({
      where: { articleId: id },
    });

    if (itemsCount > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar el artículo porque tiene items asociados',
          details: {
            items: itemsCount,
          },
        },
        { status: 400 }
      );
    }

    // Eliminar artículo
    await prisma.article.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Artículo eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

