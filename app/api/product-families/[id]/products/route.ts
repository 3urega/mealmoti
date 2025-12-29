import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const addProductSchema = z.object({
  productId: z.string().min(1, 'El ID del producto es requerido'),
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

async function hasAccessToProduct(
  userId: string,
  productId: string
): Promise<{ hasAccess: boolean; product: any }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return { hasAccess: false, product: null };
  }

  const isOwner = product.createdById === userId;
  const isGeneral = product.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, product };
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
    const { hasAccess, isOwner, family } = await hasAccessToFamily(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Familia no encontrada o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede añadir productos
    if (!family.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para añadir productos a esta familia' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { productId } = addProductSchema.parse(body);

    // Verificar acceso al producto
    const { hasAccess: hasProductAccess, product } = await hasAccessToProduct(
      user.id,
      productId
    );

    if (!hasProductAccess || !product) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Verificar si ya existe la relación
    const existingRelation = await prisma.productProductFamily.findUnique({
      where: {
        productId_familyId: {
          productId,
          familyId: id,
        },
      },
    });

    if (existingRelation) {
      return NextResponse.json(
        { error: 'El producto ya pertenece a esta familia' },
        { status: 400 }
      );
    }

    // Crear relación
    await prisma.productProductFamily.create({
      data: {
        productId,
        familyId: id,
      },
    });

    // Obtener producto actualizado con familias
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        families: {
          include: {
            family: {
              select: {
                id: true,
                name: true,
                description: true,
                isGeneral: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        product: {
          id: updatedProduct!.id,
          name: updatedProduct!.name,
          description: updatedProduct!.description,
          isGeneral: updatedProduct!.isGeneral,
          families: updatedProduct!.families.map((ppf) => ({
            id: ppf.family.id,
            name: ppf.family.name,
            description: ppf.family.description,
            isGeneral: ppf.family.isGeneral,
          })),
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
    console.error('Error in POST /api/product-families/[id]/products:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

