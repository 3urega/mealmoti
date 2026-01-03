import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { canCreatePublicItems, canManageCatalog } from '@/lib/auth';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  description: z.string().optional(),
  isGeneral: z.boolean().optional(),
});

async function hasAccessToProduct(
  userId: string,
  productId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; product: any }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return { hasAccess: false, isOwner: false, product: null };
  }

  const isOwner = product.createdById === userId;
  const isGeneral = product.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, isOwner, product };
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
    const { hasAccess, product } = await hasAccessToProduct(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Obtener producto con artículos, ingredientes y familias
    const productWithDetails = await prisma.product.findUnique({
      where: { id },
      include: {
        articles: {
          select: {
            id: true,
            name: true,
            brand: true,
            variant: true,
            suggestedPrice: true,
            isGeneral: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        families: {
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
        },
        subfamilies: {
          include: {
            subfamily: {
              select: {
                id: true,
                name: true,
                description: true,
                familyId: true,
                family: {
                  select: {
                    id: true,
                    name: true,
                    isGeneral: true,
                  },
                },
              },
            },
          },
          orderBy: {
            subfamily: {
              name: 'asc',
            },
          },
        },
        varieties: {
          include: {
            variety: {
              select: {
                id: true,
                name: true,
                subfamilyId: true,
                subfamily: {
                  select: {
                    id: true,
                    name: true,
                    familyId: true,
                    family: {
                      select: {
                        id: true,
                        name: true,
                        isGeneral: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            variety: {
              name: 'asc',
            },
          },
        },
        tags: {
          include: {
            tag: {
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
            tag: {
              name: 'asc',
            },
          },
        },
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    if (!productWithDetails) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Formatear respuesta
    const formattedProduct = {
      id: productWithDetails.id,
      name: productWithDetails.name,
      description: productWithDetails.description,
      isGeneral: productWithDetails.isGeneral,
      createdById: productWithDetails.createdById,
      articles: productWithDetails.articles,
      ingredients: productWithDetails.ingredients.map((pi: typeof productWithDetails.ingredients[0]) => ({
        id: pi.ingredient.id,
        name: pi.ingredient.name,
        type: pi.ingredient.type,
        isOptional: pi.isOptional,
      })),
      families: productWithDetails.families.map((ppf: typeof productWithDetails.families[0]) => ({
        id: ppf.family.id,
        name: ppf.family.name,
        description: ppf.family.description,
        isGeneral: ppf.family.isGeneral,
        createdById: ppf.family.createdById,
      })),
      subfamilies: productWithDetails.subfamilies.map((pps: typeof productWithDetails.subfamilies[0]) => ({
        id: pps.subfamily.id,
        name: pps.subfamily.name,
        description: pps.subfamily.description,
        familyId: pps.subfamily.familyId,
        family: pps.subfamily.family,
      })),
      varieties: productWithDetails.varieties.map((ppv: typeof productWithDetails.varieties[0]) => ({
        id: ppv.variety.id,
        name: ppv.variety.name,
        subfamilyId: ppv.variety.subfamilyId,
        subfamily: ppv.variety.subfamily,
      })),
      tags: productWithDetails.tags.map((ppt: typeof productWithDetails.tags[0]) => ({
        id: ppt.tag.id,
        name: ppt.tag.name,
        description: ppt.tag.description,
        isGeneral: ppt.tag.isGeneral,
        createdById: ppt.tag.createdById,
      })),
      articlesCount: productWithDetails._count.articles,
      createdAt: productWithDetails.createdAt,
      updatedAt: productWithDetails.updatedAt,
    };

    return NextResponse.json({ product: formattedProduct }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/products/[id]:', error);
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

    // Verificar permisos para gestionar catálogo
    if (!canManageCatalog(user.role)) {
      return NextResponse.json(
        {
          error: 'No tienes permisos para realizar esta acción',
          details: 'Solo usuarios con rol de gestión pueden crear/modificar/eliminar elementos del catálogo',
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { hasAccess, isOwner, product } = await hasAccessToProduct(
      user.id,
      id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede actualizar
    if (!product.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para actualizar este producto' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    // Verificar si hay una solicitud pendiente para este producto
    const pendingRequest = await prisma.publicInclusionRequest.findUnique({
      where: {
        itemType_itemId: {
          itemType: 'product',
          itemId: id,
        },
      },
    });

    if (pendingRequest && pendingRequest.status === 'pending') {
      return NextResponse.json(
        {
          error: 'No se puede modificar este producto porque tiene una solicitud de incorporación pública pendiente',
        },
        { status: 400 }
      );
    }

    // Verificar si el usuario intenta hacer el producto público
    if (validatedData.isGeneral === true && !canCreatePublicItems(user.role)) {
      return NextResponse.json(
        { 
          error: 'No tienes permiso para hacer este producto público. Solo puedes crear y editar productos privados.',
          details: 'Los usuarios normales solo pueden gestionar productos para uso privado.'
        },
        { status: 403 }
      );
    }

    // Si se intenta cambiar isGeneral de true a false, validar que no tenga artículos generales
    if (
      validatedData.isGeneral === false &&
      product.isGeneral === true
    ) {
      const generalArticles = await prisma.article.count({
        where: {
          productId: id,
          isGeneral: true,
        },
      });

      if (generalArticles > 0) {
        return NextResponse.json(
          {
            error:
              'No se puede cambiar a particular porque tiene artículos generales asociados',
            details: {
              generalArticles,
            },
          },
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
      updateData.description = validatedData.description.trim() || null;
    }
    if (validatedData.isGeneral !== undefined) {
      updateData.isGeneral = validatedData.isGeneral;
      // Si cambia a particular, asignar createdById
      if (validatedData.isGeneral === false && product.isGeneral === true) {
        updateData.createdById = user.id;
      }
      // Si cambia a general, limpiar createdById
      if (validatedData.isGeneral === true && product.isGeneral === false) {
        updateData.createdById = null;
      }
    }

    // Actualizar producto
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        product: {
          id: updatedProduct.id,
          name: updatedProduct.name,
          description: updatedProduct.description,
          isGeneral: updatedProduct.isGeneral,
          createdById: updatedProduct.createdById,
          articlesCount: updatedProduct._count.articles,
          updatedAt: updatedProduct.updatedAt,
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
    console.error('Error in PUT /api/products/[id]:', error);
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

    // Verificar permisos para gestionar catálogo
    if (!canManageCatalog(user.role)) {
      return NextResponse.json(
        {
          error: 'No tienes permisos para realizar esta acción',
          details: 'Solo usuarios con rol de gestión pueden crear/modificar/eliminar elementos del catálogo',
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { hasAccess, isOwner, product } = await hasAccessToProduct(
      user.id,
      id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede eliminar
    if (!product.isGeneral && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este producto' },
        { status: 403 }
      );
    }

    // Verificar si tiene artículos asociados
    const articlesCount = await prisma.article.count({
      where: { productId: id },
    });

    if (articlesCount > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar el producto porque tiene artículos asociados',
          details: {
            articles: articlesCount,
          },
        },
        { status: 400 }
      );
    }

    // Eliminar producto
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Producto eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

