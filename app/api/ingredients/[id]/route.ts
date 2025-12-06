import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateIngredientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  type: z.enum(['chemical', 'generic', 'product']).optional(),
  description: z.string().optional(),
  allergenInfo: z.string().optional(),
  productId: z.string().nullish(),
}).refine((data: { type?: string; productId?: string | null }) => {
  if (data.type === 'product') {
    return !!data.productId;
  }
  return true;
}, {
  message: "productId es requerido cuando type es 'product'",
  path: ['productId'],
});

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

    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ingredient }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/ingredients/[id]:', error);
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
    const body = await request.json();
    const validatedData = updateIngredientSchema.parse(body);

    // Verificar que el ingrediente existe
    const existingIngredient = await prisma.ingredient.findUnique({
      where: { id },
    });

    if (!existingIngredient) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      );
    }

    // Si se proporciona productId, validar que existe
    if (validatedData.productId !== undefined && validatedData.productId !== null) {
      const product = await prisma.product.findUnique({
        where: { id: validatedData.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Producto no encontrado' },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.type !== undefined) {
      updateData.type = validatedData.type;
      // Si cambia el type de "product" a otro, limpiar productId
      if (validatedData.type !== 'product') {
        updateData.productId = null;
      } else if (validatedData.productId !== undefined) {
        updateData.productId = validatedData.productId;
      }
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.allergenInfo !== undefined) {
      updateData.allergenInfo = validatedData.allergenInfo;
    }
    if (validatedData.productId !== undefined && validatedData.type === 'product') {
      updateData.productId = validatedData.productId;
    }

    // Actualizar ingrediente
    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({ ingredient }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in PUT /api/ingredients/[id]:', error);
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

    // Verificar que el ingrediente existe
    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingrediente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si está en uso
    const inProducts = await prisma.productIngredient.count({
      where: { ingredientId: id },
    });

    const inArticles = await prisma.articleIngredient.count({
      where: { ingredientId: id },
    });

    if (inProducts > 0 || inArticles > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar el ingrediente porque está asociado a productos o artículos',
          details: {
            products: inProducts,
            articles: inArticles,
          },
        },
        { status: 400 }
      );
    }

    // Eliminar ingrediente
    await prisma.ingredient.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Ingrediente eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/ingredients/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

