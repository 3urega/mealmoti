import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateProductFamilySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  description: z.string().optional(),
  isGeneral: z.boolean().optional(),
});

async function hasAccessToFamily(
  userId: string,
  familyId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; family: any }> {
  const family = await prisma.productFamily.findUnique({
    where: { id: familyId },
  });

  if (!family) {
    return { hasAccess: false, isOwner: false, family: null };
  }

  const isOwner = family.createdById === userId;
  const isGeneral = family.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, isOwner, family };
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
    const { hasAccess } = await hasAccessToFamily(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Familia no encontrada o sin acceso' },
        { status: 404 }
      );
    }

    // Obtener familia con productos asociados
    const family = await prisma.productFamily.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
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

    if (!family) {
      return NextResponse.json(
        { error: 'Familia no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        family: {
          id: family.id,
          name: family.name,
          description: family.description,
          isGeneral: family.isGeneral,
          createdById: family.createdById,
          productsCount: family._count.products,
          products: family.products.map((ppf) => ({
            id: ppf.product.id,
            name: ppf.product.name,
            description: ppf.product.description,
            isGeneral: ppf.product.isGeneral,
          })),
          createdAt: family.createdAt,
          updatedAt: family.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/product-families/[id]:', error);
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
    const { hasAccess, isOwner, family } = await hasAccessToFamily(
      user.id,
      id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Familia no encontrada o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede actualizar
    if (!family.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para actualizar esta familia' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateProductFamilySchema.parse(body);

    // Si se cambia el nombre, verificar que sea único
    if (validatedData.name && validatedData.name.trim() !== family.name) {
      const existingFamily = await prisma.productFamily.findFirst({
        where: {
          name: validatedData.name.trim(),
          isGeneral: validatedData.isGeneral ?? family.isGeneral,
          createdById:
            validatedData.isGeneral ?? family.isGeneral
              ? null
              : user.id,
          NOT: {
            id: id,
          },
        },
      });

      if (existingFamily) {
        return NextResponse.json(
          { error: 'Ya existe una familia con ese nombre' },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name.trim();
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description?.trim() || null;
    }
    if (validatedData.isGeneral !== undefined) {
      updateData.isGeneral = validatedData.isGeneral;
      // Si cambia a particular, asignar createdById
      if (validatedData.isGeneral === false && family.isGeneral === true) {
        updateData.createdById = user.id;
      }
      // Si cambia a general, limpiar createdById
      if (validatedData.isGeneral === true && family.isGeneral === false) {
        updateData.createdById = null;
      }
    }

    // Actualizar familia
    const updatedFamily = await prisma.productFamily.update({
      where: { id },
      data: updateData,
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
        family: {
          id: updatedFamily.id,
          name: updatedFamily.name,
          description: updatedFamily.description,
          isGeneral: updatedFamily.isGeneral,
          createdById: updatedFamily.createdById,
          productsCount: updatedFamily._count.products,
          createdAt: updatedFamily.createdAt,
          updatedAt: updatedFamily.updatedAt,
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
    console.error('Error in PUT /api/product-families/[id]:', error);
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
    const { hasAccess, isOwner, family } = await hasAccessToFamily(
      user.id,
      id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Familia no encontrada o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede eliminar
    if (!family.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta familia' },
        { status: 403 }
      );
    }

    // Verificar si tiene productos asociados
    const productsCount = await prisma.productProductFamily.count({
      where: { familyId: id },
    });

    if (productsCount > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar la familia porque tiene productos asociados',
          details: {
            products: productsCount,
          },
        },
        { status: 400 }
      );
    }

    // Eliminar familia
    await prisma.productFamily.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Familia eliminada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/product-families/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

