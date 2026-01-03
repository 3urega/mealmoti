import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assignSubfamilySchema = z.object({
  subfamilyId: z.string().min(1, 'El ID de la subfamilia es requerido'),
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
    const validatedData = assignSubfamilySchema.parse(body);

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

    // Verificar que la subfamilia existe y obtener su familia
    const subfamily = await prisma.productSubfamily.findUnique({
      where: { id: validatedData.subfamilyId },
      include: {
        family: {
          select: {
            id: true,
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

    // Verificar que no está ya asignada
    const existingAssignment = await prisma.productProductSubfamily.findUnique({
      where: {
        productId_subfamilyId: {
          productId: id,
          subfamilyId: validatedData.subfamilyId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'El producto ya está asignado a esta subfamilia' },
        { status: 400 }
      );
    }

    // Usar transacción para asignar subfamilia y familia
    await prisma.$transaction(async (tx) => {
      // Asignar subfamilia al producto
      await tx.productProductSubfamily.create({
        data: {
          productId: id,
          subfamilyId: validatedData.subfamilyId,
        },
      });

      // Verificar y asignar familia si no está asignada
      const existingFamily = await tx.productProductFamily.findUnique({
        where: {
          productId_familyId: {
            productId: id,
            familyId: subfamily.family.id,
          },
        },
      });

      if (!existingFamily) {
        await tx.productProductFamily.create({
          data: {
            productId: id,
            familyId: subfamily.family.id,
          },
        });
      }
    });

    return NextResponse.json(
      { message: 'Subfamilia asignada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/products/[id]/subfamilies:', error);
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
    const subfamilyId = searchParams.get('subfamilyId');

    if (!subfamilyId) {
      return NextResponse.json(
        { error: 'subfamilyId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la asignación existe
    const assignment = await prisma.productProductSubfamily.findUnique({
      where: {
        productId_subfamilyId: {
          productId: id,
          subfamilyId: subfamilyId,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'El producto no está asignado a esta subfamilia' },
        { status: 404 }
      );
    }

    // Remover asignación
    await prisma.productProductSubfamily.delete({
      where: {
        productId_subfamilyId: {
          productId: id,
          subfamilyId: subfamilyId,
        },
      },
    });

    return NextResponse.json(
      { message: 'Subfamilia removida correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]/subfamilies:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

