import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSubfamilySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
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

    const subfamily = await prisma.productSubfamily.findUnique({
      where: { id },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            isGeneral: true,
          },
        },
        _count: {
          select: {
            products: true,
            varieties: true,
          },
        },
      },
    });

    if (!subfamily) {
      return NextResponse.json(
        { error: 'Subfamilia no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        subfamily: {
          id: subfamily.id,
          name: subfamily.name,
          description: subfamily.description,
          familyId: subfamily.familyId,
          family: subfamily.family,
          productsCount: subfamily._count.products,
          varietiesCount: subfamily._count.varieties,
          createdAt: subfamily.createdAt,
          updatedAt: subfamily.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/product-subfamilies/[id]:', error);
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
    const validatedData = updateSubfamilySchema.parse(body);

    // Verificar que la subfamilia existe
    const subfamily = await prisma.productSubfamily.findUnique({
      where: { id },
      include: {
        family: true,
      },
    });

    if (!subfamily) {
      return NextResponse.json(
        { error: 'Subfamilia no encontrada' },
        { status: 404 }
      );
    }

    // Si se cambia el nombre, validar que no existe otra con el mismo nombre en la familia
    if (validatedData.name && validatedData.name.trim() !== subfamily.name) {
      const existingSubfamily = await prisma.productSubfamily.findUnique({
        where: {
          name_familyId: {
            name: validatedData.name.trim(),
            familyId: subfamily.familyId,
          },
        },
      });

      if (existingSubfamily) {
        return NextResponse.json(
          { error: 'Ya existe una subfamilia con ese nombre en esta familia' },
          { status: 400 }
        );
      }
    }

    // Actualizar subfamilia
    const updateData: any = {};
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name.trim();
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description?.trim() || null;
    }

    const updatedSubfamily = await prisma.productSubfamily.update({
      where: { id },
      data: updateData,
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
          id: updatedSubfamily.id,
          name: updatedSubfamily.name,
          description: updatedSubfamily.description,
          familyId: updatedSubfamily.familyId,
          productsCount: updatedSubfamily._count.products,
          varietiesCount: updatedSubfamily._count.varieties,
          updatedAt: updatedSubfamily.updatedAt,
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
    console.error('Error in PUT /api/product-subfamilies/[id]:', error);
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

    // Verificar que la subfamilia existe
    const subfamily = await prisma.productSubfamily.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            varieties: true,
          },
        },
      },
    });

    if (!subfamily) {
      return NextResponse.json(
        { error: 'Subfamilia no encontrada' },
        { status: 404 }
      );
    }

    // Validar que no tenga productos ni variedades
    if (subfamily._count.products > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar la subfamilia porque tiene productos asociados',
          details: {
            products: subfamily._count.products,
          },
        },
        { status: 400 }
      );
    }

    if (subfamily._count.varieties > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar la subfamilia porque tiene variedades asociadas',
          details: {
            varieties: subfamily._count.varieties,
          },
        },
        { status: 400 }
      );
    }

    // Eliminar subfamilia
    await prisma.productSubfamily.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Subfamilia eliminada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/product-subfamilies/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

