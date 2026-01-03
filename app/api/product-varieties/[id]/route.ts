import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateVarietySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
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

    const variety = await prisma.productVariety.findUnique({
      where: { id },
      include: {
        subfamily: {
          include: {
            family: {
              select: {
                id: true,
                name: true,
                isGeneral: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!variety) {
      return NextResponse.json(
        { error: 'Variedad no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        variety: {
          id: variety.id,
          name: variety.name,
          subfamilyId: variety.subfamilyId,
          subfamily: variety.subfamily,
          productsCount: variety._count.products,
          createdAt: variety.createdAt,
          updatedAt: variety.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/product-varieties/[id]:', error);
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
    const validatedData = updateVarietySchema.parse(body);

    // Verificar que la variedad existe
    const variety = await prisma.productVariety.findUnique({
      where: { id },
    });

    if (!variety) {
      return NextResponse.json(
        { error: 'Variedad no encontrada' },
        { status: 404 }
      );
    }

    // Si se cambia el nombre, validar que no existe otra con el mismo nombre en la subfamilia
    if (validatedData.name && validatedData.name.trim() !== variety.name) {
      const existingVariety = await prisma.productVariety.findUnique({
        where: {
          name_subfamilyId: {
            name: validatedData.name.trim(),
            subfamilyId: variety.subfamilyId,
          },
        },
      });

      if (existingVariety) {
        return NextResponse.json(
          { error: 'Ya existe una variedad con ese nombre en esta subfamilia' },
          { status: 400 }
        );
      }
    }

    // Actualizar variedad
    const updatedVariety = await prisma.productVariety.update({
      where: { id },
      data: {
        name: validatedData.name?.trim(),
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
          id: updatedVariety.id,
          name: updatedVariety.name,
          subfamilyId: updatedVariety.subfamilyId,
          productsCount: updatedVariety._count.products,
          updatedAt: updatedVariety.updatedAt,
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
    console.error('Error in PUT /api/product-varieties/[id]:', error);
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

    // Verificar que la variedad existe
    const variety = await prisma.productVariety.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!variety) {
      return NextResponse.json(
        { error: 'Variedad no encontrada' },
        { status: 404 }
      );
    }

    // Validar que no tenga productos
    if (variety._count.products > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar la variedad porque tiene productos asociados',
          details: {
            products: variety._count.products,
          },
        },
        { status: 400 }
      );
    }

    // Eliminar variedad
    await prisma.productVariety.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Variedad eliminada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/product-varieties/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

