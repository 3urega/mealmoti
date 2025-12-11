import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assignFamiliesSchema = z.object({
  familyIds: z.array(z.string()).min(1, 'Debe seleccionar al menos una familia'),
});

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

async function hasAccessToFamily(
  userId: string,
  familyId: string
): Promise<{ hasAccess: boolean }> {
  const family = await prisma.productFamily.findUnique({
    where: { id: familyId },
  });

  if (!family) {
    return { hasAccess: false };
  }

  const isGeneral = family.isGeneral;
  const isOwner = family.createdById === userId;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess };
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
    const { hasAccess } = await hasAccessToProduct(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Obtener familias del producto
    const productFamilies = await prisma.productProductFamily.findMany({
      where: { productId: id },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            description: true,
            isGeneral: true,
            createdById: true,
          },
        },
      },
      orderBy: {
        family: {
          name: 'asc',
        },
      },
    });

    const families = productFamilies.map((ppf) => ({
      id: ppf.family.id,
      name: ppf.family.name,
      description: ppf.family.description,
      isGeneral: ppf.family.isGeneral,
      createdById: ppf.family.createdById,
    }));

    return NextResponse.json({ families }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/products/[id]/families:', error);
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
    const { hasAccess } = await hasAccessToProduct(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { familyIds } = assignFamiliesSchema.parse(body);

    // Verificar acceso a todas las familias
    for (const familyId of familyIds) {
      const { hasAccess: hasFamilyAccess } = await hasAccessToFamily(
        user.id,
        familyId
      );
      if (!hasFamilyAccess) {
        return NextResponse.json(
          { error: `No tienes acceso a la familia ${familyId}` },
          { status: 403 }
        );
      }
    }

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

    // Crear relaciones (usar createMany con skipDuplicates)
    await prisma.productProductFamily.createMany({
      data: familyIds.map((familyId) => ({
        productId: id,
        familyId,
      })),
      skipDuplicates: true,
    });

    // Obtener familias actualizadas
    const productFamilies = await prisma.productProductFamily.findMany({
      where: { productId: id },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            description: true,
            isGeneral: true,
            createdById: true,
          },
        },
      },
    });

    const families = productFamilies.map((ppf) => ({
      id: ppf.family.id,
      name: ppf.family.name,
      description: ppf.family.description,
      isGeneral: ppf.family.isGeneral,
      createdById: ppf.family.createdById,
    }));

    return NextResponse.json({ families }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/products/[id]/families:', error);
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
    const familyId = searchParams.get('familyId');

    if (!familyId) {
      return NextResponse.json(
        { error: 'familyId es requerido' },
        { status: 400 }
      );
    }

    const { hasAccess } = await hasAccessToProduct(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Eliminar relación
    await prisma.productProductFamily.deleteMany({
      where: {
        productId: id,
        familyId: familyId,
      },
    });

    return NextResponse.json(
      { message: 'Familia removida del producto correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]/families:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

