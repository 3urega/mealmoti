import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createArticleSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  productId: z.string().min(1, 'El producto es requerido'),
  brand: z.string().min(1, 'La marca es requerida').default('genérico'),
  variant: z.string().optional(),
  weightInGrams: z.number().positive('El peso debe ser positivo').optional().nullable(),
  suggestedPrice: z.number().positive('El precio debe ser positivo').optional(),
  isGeneral: z.boolean().default(false),
  ingredientIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const general = searchParams.get('general');
    const search = searchParams.get('search');
    const brand = searchParams.get('brand');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtros
    const where: any = {
      OR: [
        { isGeneral: true },
        { createdById: user.id },
      ],
    };

    // Filtro por producto
    if (productId) {
      where.productId = productId;
    }

    // Filtro por general
    if (general === 'true') {
      where.OR = [{ isGeneral: true }];
    } else if (general === 'false') {
      where.OR = [{ createdById: user.id, isGeneral: false }];
    }

    // Búsqueda por nombre o marca
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filtro por marca
    if (brand) {
      where.brand = {
        contains: brand,
        mode: 'insensitive',
      };
    }

    // Obtener total para paginación
    const total = await prisma.article.count({ where });

    // Obtener artículos
    const articles = await prisma.article.findMany({
      where,
      select: {
        id: true,
        name: true,
        brand: true,
        variant: true,
        weightInGrams: true,
        suggestedPrice: true,
        isGeneral: true,
        createdById: true,
        createdAt: true,
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
      orderBy: {
        name: 'asc',
      },
      take: limit,
      skip: offset,
    });

    // Formatear respuesta
    const formattedArticles = articles.map((article: any) => ({
      id: article.id,
      name: article.name,
      product: article.product,
      brand: article.brand,
      variant: article.variant,
      suggestedPrice: article.suggestedPrice,
      isGeneral: article.isGeneral,
      createdById: article.createdById,
      storesCount: article._count.stores,
      createdAt: article.createdAt,
    }));

    return NextResponse.json(
      {
        articles: formattedArticles,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/articles:', error);
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
    const validatedData = createArticleSchema.parse(body);

    // Verificar que el producto existe y el usuario tiene acceso
    const product = await prisma.product.findUnique({
      where: { id: validatedData.productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 400 }
      );
    }

    // Verificar acceso al producto (general o del usuario)
    if (!product.isGeneral && product.createdById !== user.id) {
      return NextResponse.json(
        { error: 'No tienes acceso a este producto' },
        { status: 403 }
      );
    }

    // Verificar ingredientes si se proporcionan
    if (validatedData.ingredientIds && validatedData.ingredientIds.length > 0) {
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
    }

    // Crear artículo
    const article = await prisma.article.create({
      data: {
        name: validatedData.name.trim(),
        productId: validatedData.productId,
        brand: validatedData.brand.trim() || 'genérico',
        variant: validatedData.variant?.trim() || null,
        weightInGrams: validatedData.weightInGrams || null,
        suggestedPrice: validatedData.suggestedPrice || null,
        isGeneral: validatedData.isGeneral,
        createdById: validatedData.isGeneral ? null : user.id,
      },
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

    // Asignar ingredientes si se proporcionan
    if (validatedData.ingredientIds && validatedData.ingredientIds.length > 0) {
      await Promise.all(
        validatedData.ingredientIds.map((ingredientId: string) =>
          prisma.articleIngredient.create({
            data: {
              articleId: article.id,
              ingredientId,
              isOptional: false,
            },
          })
        )
      );
    }

    // Obtener artículo completo con ingredientes
    const articleWithIngredients = await prisma.article.findUnique({
      where: { id: article.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
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
            stores: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        article: {
          id: articleWithIngredients!.id,
          name: articleWithIngredients!.name,
          product: articleWithIngredients!.product,
          brand: articleWithIngredients!.brand,
          variant: articleWithIngredients!.variant,
          suggestedPrice: articleWithIngredients!.suggestedPrice,
          isGeneral: articleWithIngredients!.isGeneral,
          createdById: articleWithIngredients!.createdById,
          ingredients: articleWithIngredients!.ingredients.map((ai: any) => ({
            id: ai.ingredient.id,
            name: ai.ingredient.name,
            type: ai.ingredient.type,
            isOptional: ai.isOptional,
          })),
          storesCount: articleWithIngredients!._count.stores,
          createdAt: articleWithIngredients!.createdAt,
        },
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
    console.error('Error in POST /api/articles:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

