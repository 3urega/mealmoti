import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assignTagSchema = z.object({
  tagId: z.string().min(1, 'El ID del tag es requerido'),
});

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
    const validatedData = assignTagSchema.parse(body);

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el tag existe y el usuario tiene acceso
    const tag = await prisma.productTag.findUnique({
      where: { id: validatedData.tagId },
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag no encontrado' },
        { status: 404 }
      );
    }

    // Verificar acceso al tag (general o del usuario)
    if (!tag.isGeneral && tag.createdById !== user.id) {
      return NextResponse.json(
        { error: 'No tienes acceso a este tag' },
        { status: 403 }
      );
    }

    // Verificar que no está ya asignado
    const existingAssignment = await prisma.productProductTag.findUnique({
      where: {
        productId_tagId: {
          productId: id,
          tagId: validatedData.tagId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'El producto ya está asignado a este tag' },
        { status: 400 }
      );
    }

    // Asignar tag al producto
    await prisma.productProductTag.create({
      data: {
        productId: id,
        tagId: validatedData.tagId,
      },
    });

    return NextResponse.json(
      { message: 'Tag asignado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/products/[id]/tags:', error);
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
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json(
        { error: 'tagId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la asignación existe
    const assignment = await prisma.productProductTag.findUnique({
      where: {
        productId_tagId: {
          productId: id,
          tagId: tagId,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'El producto no está asignado a este tag' },
        { status: 404 }
      );
    }

    // Remover asignación
    await prisma.productProductTag.delete({
      where: {
        productId_tagId: {
          productId: id,
          tagId: tagId,
        },
      },
    });

    return NextResponse.json(
      { message: 'Tag removido correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]/tags:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

