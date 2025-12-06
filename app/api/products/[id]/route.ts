import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  description: z.string().optional(),
  isGeneral: z.boolean().optional(),
});

async function hasAccessToProduct(
  userId: string,
  productId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; product: any }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return { hasAccess: false, isOwner: false, product: null };
  }

  const isOwner = product.createdById === userId;
  const isGeneral = product.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, isOwner, product };
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
    const { hasAccess, product } = await hasAccessToProduct(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Obtener producto con artículos e ingredientes
    const productWithDetails = await prisma.product.findUnique({
      where: { id },
      include: {
        articles: {
          select: {
            id: true,
            name: true,
            brand: true,
            variant: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    if (!productWithDetails) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Formatear respuesta
    const formattedProduct = {
      id: productWithDetails.id,
      name: productWithDetails.name,
      description: productWithDetails.description,
      isGeneral: productWithDetails.isGeneral,
      createdById: productWithDetails.createdById,
      articles: productWithDetails.articles,
      ingredients: productWithDetails.ingredients.map((pi: typeof productWithDetails.ingredients[0]) => ({
        id: pi.ingredient.id,
        name: pi.ingredient.name,
        type: pi.ingredient.type,
        isOptional: pi.isOptional,
      })),
      articlesCount: productWithDetails._count.articles,
      createdAt: productWithDetails.createdAt,
      updatedAt: productWithDetails.updatedAt,
    };

    return NextResponse.json({ product: formattedProduct }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/products/[id]:', error);
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
    const { hasAccess, isOwner, product } = await hasAccessToProduct(
      user.id,
      id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede actualizar
    if (!product.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para actualizar este producto' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    // Si se intenta cambiar isGeneral de true a false, validar que no tenga artículos generales
    if (
      validatedData.isGeneral === false &&
      product.isGeneral === true
    ) {
      const generalArticles = await prisma.article.count({
        where: {
          productId: id,
          isGeneral: true,
        },
      });

      if (generalArticles > 0) {
        return NextResponse.json(
          {
            error:
              'No se puede cambiar a particular porque tiene artículos generales asociados',
            details: {
              generalArticles,
            },
          },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name.trim();
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description.trim() || null;
    }
    if (validatedData.isGeneral !== undefined) {
      updateData.isGeneral = validatedData.isGeneral;
      // Si cambia a particular, asignar createdById
      if (validatedData.isGeneral === false && product.isGeneral === true) {
        updateData.createdById = user.id;
      }
      // Si cambia a general, limpiar createdById
      if (validatedData.isGeneral === true && product.isGeneral === false) {
        updateData.createdById = null;
      }
    }

    // Actualizar producto
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        product: {
          id: updatedProduct.id,
          name: updatedProduct.name,
          description: updatedProduct.description,
          isGeneral: updatedProduct.isGeneral,
          createdById: updatedProduct.createdById,
          articlesCount: updatedProduct._count.articles,
          updatedAt: updatedProduct.updatedAt,
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
    console.error('Error in PUT /api/products/[id]:', error);
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
    const { hasAccess, isOwner, product } = await hasAccessToProduct(
      user.id,
      id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede eliminar
    if (!product.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este producto' },
        { status: 403 }
      );
    }

    // Verificar si tiene artículos asociados
    const articlesCount = await prisma.article.count({
      where: { productId: id },
    });

    if (articlesCount > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar el producto porque tiene artículos asociados',
          details: {
            articles: articlesCount,
          },
        },
        { status: 400 }
      );
    }

    // Eliminar producto
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Producto eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

