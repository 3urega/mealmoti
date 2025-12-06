import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createIngredientSchema = z.object({
  productId: z.string().min(1, 'El producto es requerido'),
  quantity: z.number().positive('La cantidad debe ser positiva'),
  unit: z.string().min(1, 'La unidad es requerida'),
  isOptional: z.boolean().optional().default(false),
  notes: z.string().optional(),
  order: z.number().int().optional().default(0),
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

    const { id } = await params;
    const { hasAccess } = await hasAccessToRecipe(user.id, id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ingredients = await prisma.recipeIngredient.findMany({
      where: { recipeId: id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json({ ingredients }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/recipes/[id]/ingredients:', error);
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
    const { hasAccess, isOwner } = await hasAccessToRecipe(user.id, id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Solo el creador puede agregar ingredientes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { productId, quantity, unit, isOptional, notes, order } =
      createIngredientSchema.parse(body);

    // Verificar que el producto existe y es accesible
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (!product.isGeneral && product.createdById !== user.id) {
      return NextResponse.json(
        { error: 'No tienes acceso a este producto' },
        { status: 403 }
      );
    }

    const ingredient = await prisma.recipeIngredient.create({
      data: {
        recipeId: id,
        productId,
        quantity,
        unit,
        isOptional: isOptional ?? false,
        notes,
        order: order ?? 0,
      },
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

    return NextResponse.json({ ingredient }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/recipes/[id]/ingredients:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

