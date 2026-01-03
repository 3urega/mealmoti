import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createVarietySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
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
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verificar que la subfamilia existe
    const subfamily = await prisma.productSubfamily.findUnique({
      where: { id },
    });

    if (!subfamily) {
      return NextResponse.json(
        { error: 'Subfamilia no encontrada' },
        { status: 404 }
      );
    }

    // Obtener variedades con conteo de productos
    const varieties = await prisma.productVariety.findMany({
      where: { subfamilyId: id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.productVariety.count({
      where: { subfamilyId: id },
    });

    return NextResponse.json(
      {
        varieties: varieties.map((v) => ({
          id: v.id,
          name: v.name,
          subfamilyId: v.subfamilyId,
          productsCount: v._count.products,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })),
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/product-subfamilies/[id]/varieties:', error);
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
    const body = await request.json();
    const validatedData = createVarietySchema.parse(body);

    // Verificar que la subfamilia existe
    const subfamily = await prisma.productSubfamily.findUnique({
      where: { id },
    });

    if (!subfamily) {
      return NextResponse.json(
        { error: 'Subfamilia no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que no existe una variedad con el mismo nombre en esta subfamilia
    const existingVariety = await prisma.productVariety.findUnique({
      where: {
        name_subfamilyId: {
          name: validatedData.name.trim(),
          subfamilyId: id,
        },
      },
    });

    if (existingVariety) {
      return NextResponse.json(
        { error: 'Ya existe una variedad con ese nombre en esta subfamilia' },
        { status: 400 }
      );
    }

    // Crear variedad
    const variety = await prisma.productVariety.create({
      data: {
        name: validatedData.name.trim(),
        subfamilyId: id,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        variety: {
          id: variety.id,
          name: variety.name,
          subfamilyId: variety.subfamilyId,
          productsCount: variety._count.products,
          createdAt: variety.createdAt,
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
    console.error('Error in POST /api/product-subfamilies/[id]/varieties:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

