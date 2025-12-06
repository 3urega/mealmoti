import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createIngredientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['chemical', 'generic', 'product']),
  description: z.string().optional(),
  allergenInfo: z.string().optional(),
  productId: z.string().nullish(),
}).refine((data) => {
  if (data.type === 'product') {
    return !!data.productId;
  }
  return true;
}, {
  message: "productId es requerido cuando type es 'product'",
  path: ['productId'],
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtros
    const where: any = {};

    if (type && ['chemical', 'generic', 'product'].includes(type)) {
      where.type = type;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Obtener total para paginación
    const total = await prisma.ingredient.count({ where });

    // Obtener ingredientes
    const ingredients = await prisma.ingredient.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(
      {
        ingredients,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/ingredients:', error);
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

    // Verificar que prisma está inicializado
    if (!prisma || !prisma.ingredient) {
      console.error('Prisma client not initialized or Ingredient model not available');
      return NextResponse.json(
        { error: 'Database connection error. Please restart the server.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validatedData = createIngredientSchema.parse(body);

    // Si se proporciona productId, validar que existe
    if (validatedData.productId) {
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

    // Crear ingrediente
    const ingredient = await prisma.ingredient.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        description: validatedData.description,
        allergenInfo: validatedData.allergenInfo,
        productId: validatedData.productId || null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
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
    console.error('Error in POST /api/ingredients:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

