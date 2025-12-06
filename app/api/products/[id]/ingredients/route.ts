import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assignIngredientsSchema = z.object({
  ingredientIds: z.array(z.string()).min(1, 'Debe incluir al menos un ingrediente'),
  isOptional: z.boolean().default(false),
});

async function hasAccessToProduct(
  userId: string,
  productId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return { hasAccess: false, isOwner: false };
  }

  const isOwner = product.createdById === userId;
  const isGeneral = product.isGeneral;
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
    const { hasAccess } = await hasAccessToProduct(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    const productIngredients = await prisma.productIngredient.findMany({
      where: { productId: id },
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

    const ingredients = productIngredients.map((pi: typeof productIngredients[0]) => ({
      id: pi.ingredient.id,
      name: pi.ingredient.name,
      type: pi.ingredient.type,
      description: pi.ingredient.description,
      isOptional: pi.isOptional,
    }));

    return NextResponse.json({ ingredients }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/products/[id]/ingredients:', error);
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
    const { hasAccess, isOwner } = await hasAccessToProduct(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede modificar ingredientes
    if (!isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este producto' },
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
    const productIngredients = await Promise.all(
      validatedData.ingredientIds.map(async (ingredientId: string) => {
        // Verificar si ya existe
        const existing = await prisma.productIngredient.findUnique({
          where: {
            productId_ingredientId: {
              productId: id,
              ingredientId,
            },
          },
        });

        if (existing) {
          // Actualizar
          return await prisma.productIngredient.update({
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
          return await prisma.productIngredient.create({
            data: {
              productId: id,
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
        productIngredients: productIngredients.map((pi: typeof productIngredients[0]) => ({
          id: pi.id,
          ingredient: pi.ingredient,
          isOptional: pi.isOptional,
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
    console.error('Error in POST /api/products/[id]/ingredients:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

