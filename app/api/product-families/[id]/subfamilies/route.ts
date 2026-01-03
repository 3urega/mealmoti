import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSubfamilySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
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

    // Verificar que la familia existe
    const family = await prisma.productFamily.findUnique({
      where: { id },
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Familia no encontrada' },
        { status: 404 }
      );
    }

    // Obtener subfamilias con conteo de productos
    const subfamilies = await prisma.productSubfamily.findMany({
      where: { familyId: id },
      include: {
        _count: {
          select: {
            products: true,
            varieties: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.productSubfamily.count({
      where: { familyId: id },
    });

    return NextResponse.json(
      {
        subfamilies: subfamilies.map((sf) => ({
          id: sf.id,
          name: sf.name,
          description: sf.description,
          familyId: sf.familyId,
          productsCount: sf._count.products,
          varietiesCount: sf._count.varieties,
          createdAt: sf.createdAt,
          updatedAt: sf.updatedAt,
        })),
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/product-families/[id]/subfamilies:', error);
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
    const validatedData = createSubfamilySchema.parse(body);

    // Verificar que la familia existe
    const family = await prisma.productFamily.findUnique({
      where: { id },
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Familia no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que no existe una subfamilia con el mismo nombre en esta familia
    const existingSubfamily = await prisma.productSubfamily.findUnique({
      where: {
        name_familyId: {
          name: validatedData.name.trim(),
          familyId: id,
        },
      },
    });

    if (existingSubfamily) {
      return NextResponse.json(
        { error: 'Ya existe una subfamilia con ese nombre en esta familia' },
        { status: 400 }
      );
    }

    // Crear subfamilia
    const subfamily = await prisma.productSubfamily.create({
      data: {
        name: validatedData.name.trim(),
        description: validatedData.description?.trim() || null,
        familyId: id,
      },
      include: {
        _count: {
          select: {
            products: true,
            varieties: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        subfamily: {
          id: subfamily.id,
          name: subfamily.name,
          description: subfamily.description,
          familyId: subfamily.familyId,
          productsCount: subfamily._count.products,
          varietiesCount: subfamily._count.varieties,
          createdAt: subfamily.createdAt,
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
    console.error('Error in POST /api/product-families/[id]/subfamilies:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

