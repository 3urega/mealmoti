import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { canCreatePublicItems } from '@/lib/auth';
import { z } from 'zod';

const updateTagSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  description: z.string().optional(),
  isGeneral: z.boolean().optional(),
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

    const tag = await prisma.productTag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag no encontrado' },
        { status: 404 }
      );
    }

    // Verificar acceso (general o del usuario)
    if (!tag.isGeneral && tag.createdById !== user.id) {
      return NextResponse.json(
        { error: 'No tienes acceso a este tag' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        tag: {
          id: tag.id,
          name: tag.name,
          description: tag.description,
          isGeneral: tag.isGeneral,
          createdById: tag.createdById,
          productsCount: tag._count.products,
          createdAt: tag.createdAt,
          updatedAt: tag.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/product-tags/[id]:', error);
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
    const validatedData = updateTagSchema.parse(body);

    // Verificar que el tag existe
    const tag = await prisma.productTag.findUnique({
      where: { id },
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag no encontrado' },
        { status: 404 }
      );
    }

    // Verificar acceso (general o del usuario)
    if (!tag.isGeneral && tag.createdById !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar este tag' },
        { status: 403 }
      );
    }

    // Verificar si el usuario intenta hacer el tag público
    if (validatedData.isGeneral === true && !canCreatePublicItems(user.role)) {
      return NextResponse.json(
        {
          error: 'No tienes permiso para hacer este tag público. Solo puedes crear y editar tags privados.',
          details: 'Los usuarios normales solo pueden gestionar tags para uso privado.',
        },
        { status: 403 }
      );
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
      if (validatedData.isGeneral === false && tag.isGeneral === true) {
        updateData.createdById = user.id;
      }
      // Si cambia a general, limpiar createdById
      if (validatedData.isGeneral === true && tag.isGeneral === false) {
        updateData.createdById = null;
      }
    }

    // Si se cambia el nombre, validar que no existe otro con el mismo nombre y alcance
    if (validatedData.name && validatedData.name.trim() !== tag.name) {
      const finalIsGeneral =
        validatedData.isGeneral !== undefined
          ? validatedData.isGeneral
          : tag.isGeneral;
      const finalCreatedById = finalIsGeneral ? null : tag.createdById;

      const existingTag = await prisma.productTag.findUnique({
        where: {
          name_isGeneral_createdById: {
            name: validatedData.name.trim(),
            isGeneral: finalIsGeneral,
            createdById: finalCreatedById,
          },
        },
      });

      if (existingTag && existingTag.id !== id) {
        return NextResponse.json(
          { error: 'Ya existe un tag con ese nombre' },
          { status: 400 }
        );
      }
    }

    // Actualizar tag
    const updatedTag = await prisma.productTag.update({
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
        tag: {
          id: updatedTag.id,
          name: updatedTag.name,
          description: updatedTag.description,
          isGeneral: updatedTag.isGeneral,
          createdById: updatedTag.createdById,
          productsCount: updatedTag._count.products,
          updatedAt: updatedTag.updatedAt,
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
    console.error('Error in PUT /api/product-tags/[id]:', error);
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

    // Verificar que el tag existe
    const tag = await prisma.productTag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag no encontrado' },
        { status: 404 }
      );
    }

    // Verificar acceso (general o del usuario)
    if (!tag.isGeneral && tag.createdById !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este tag' },
        { status: 403 }
      );
    }

    // Validar que no tenga productos
    if (tag._count.products > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar el tag porque tiene productos asociados',
          details: {
            products: tag._count.products,
          },
        },
        { status: 400 }
      );
    }

    // Eliminar tag
    await prisma.productTag.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Tag eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/product-tags/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

