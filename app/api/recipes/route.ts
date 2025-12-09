import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createRecipeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  servings: z.number().int().positive().optional(),
  prepTime: z.number().int().positive().optional(),
  cookTime: z.number().int().positive().optional(),
  isGeneral: z.boolean().optional().default(false),
  ingredients: z
    .array(
      z.object({
        productId: z.string().min(1, 'El producto es requerido'),
        quantity: z.number().positive('La cantidad debe ser positiva'),
        unitId: z.string().min(1, 'La unidad es requerida'),
        isOptional: z.boolean().optional().default(false),
        notes: z.string().optional(),
        order: z.number().int().optional().default(0),
      })
    )
    .min(1, 'Debe tener al menos un ingrediente'),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const general = searchParams.get('general');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {
      OR: [
        { isGeneral: true },
        { createdById: user.id },
      ],
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (general === 'true') {
      where.isGeneral = true;
      delete where.OR;
    }

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        ingredients: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.recipe.count({ where });

    return NextResponse.json({ recipes, total }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/recipes:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      instructions,
      servings,
      prepTime,
      cookTime,
      isGeneral,
      ingredients,
    } = createRecipeSchema.parse(body);

    // Verificar que todos los productos existen y son accesibles
    for (const ingredient of ingredients) {
      const product = await prisma.product.findUnique({
        where: { id: ingredient.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Producto no encontrado: ${ingredient.productId}` },
          { status: 404 }
        );
      }

      // Verificar acceso: debe ser general o del usuario
      if (!product.isGeneral && product.createdById !== user.id) {
        return NextResponse.json(
          { error: `No tienes acceso al producto: ${product.name}` },
          { status: 403 }
        );
      }
    }

    // Crear la receta con sus ingredientes
    const recipe = await prisma.recipe.create({
      data: {
        name,
        description,
        instructions,
        servings,
        prepTime,
        cookTime,
        isGeneral: isGeneral ?? false,
        createdById: user.id,
        ingredients: {
          create: ingredients.map((ing: typeof ingredients[0], index: number) => ({
            productId: ing.productId,
            quantity: ing.quantity,
            unitId: ing.unitId,
            isOptional: ing.isOptional ?? false,
            notes: ing.notes,
            order: ing.order ?? index,
          })),
        },
      },
      include: {
        ingredients: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/recipes:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

