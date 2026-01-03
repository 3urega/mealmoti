import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assignVarietySchema = z.object({
  varietyId: z.string().min(1, 'El ID de la variedad es requerido'),
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
    const validatedData = assignVarietySchema.parse(body);

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

    // Verificar que la variedad existe y obtener su subfamilia y familia
    const variety = await prisma.productVariety.findUnique({
      where: { id: validatedData.varietyId },
      include: {
        subfamily: {
          include: {
            family: {
              select: {
                id: true,
              },
            },
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

    // Verificar que no está ya asignada
    const existingAssignment = await prisma.productProductVariety.findUnique({
      where: {
        productId_varietyId: {
          productId: id,
          varietyId: validatedData.varietyId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'El producto ya está asignado a esta variedad' },
        { status: 400 }
      );
    }

    // Usar transacción para asignar variedad, subfamilia y familia
    await prisma.$transaction(async (tx) => {
      // Asignar variedad al producto
      await tx.productProductVariety.create({
        data: {
          productId: id,
          varietyId: validatedData.varietyId,
        },
      });

      // Verificar y asignar subfamilia si no está asignada
      const existingSubfamily = await tx.productProductSubfamily.findUnique({
        where: {
          productId_subfamilyId: {
            productId: id,
            subfamilyId: variety.subfamilyId,
          },
        },
      });

      if (!existingSubfamily) {
        await tx.productProductSubfamily.create({
          data: {
            productId: id,
            subfamilyId: variety.subfamilyId,
          },
        });
      }

      // Verificar y asignar familia si no está asignada
      const existingFamily = await tx.productProductFamily.findUnique({
        where: {
          productId_familyId: {
            productId: id,
            familyId: variety.subfamily.family.id,
          },
        },
      });

      if (!existingFamily) {
        await tx.productProductFamily.create({
          data: {
            productId: id,
            familyId: variety.subfamily.family.id,
          },
        });
      }
    });

    return NextResponse.json(
      { message: 'Variedad asignada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/products/[id]/varieties:', error);
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
    const varietyId = searchParams.get('varietyId');

    if (!varietyId) {
      return NextResponse.json(
        { error: 'varietyId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la asignación existe
    const assignment = await prisma.productProductVariety.findUnique({
      where: {
        productId_varietyId: {
          productId: id,
          varietyId: varietyId,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'El producto no está asignado a esta variedad' },
        { status: 404 }
      );
    }

    // Remover asignación
    await prisma.productProductVariety.delete({
      where: {
        productId_varietyId: {
          productId: id,
          varietyId: varietyId,
        },
      },
    });

    return NextResponse.json(
      { message: 'Variedad removida correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]/varieties:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

