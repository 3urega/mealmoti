import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createRequestSchema = z.object({
  itemType: z.enum(['product', 'article', 'ingredient']),
  itemId: z.string().min(1, 'El ID del item es requerido'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createRequestSchema.parse(body);

    // Verificar que no existe una solicitud pendiente para este item
    const existingRequest = await prisma.publicInclusionRequest.findUnique({
      where: {
        itemType_itemId: {
          itemType: validatedData.itemType,
          itemId: validatedData.itemId,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { error: 'Ya existe una solicitud pendiente para este item' },
          { status: 400 }
        );
      }
      // Si hay una solicitud rechazada, permitir crear una nueva
      if (existingRequest.status === 'rejected') {
        // Eliminar la solicitud rechazada anterior
        await prisma.publicInclusionRequest.delete({
          where: { id: existingRequest.id },
        });
      }
    }

    // Verificar que el item existe y el usuario es el creador
    let item: any = null;
    let isOwner = false;

    if (validatedData.itemType === 'product') {
      item = await prisma.product.findUnique({
        where: { id: validatedData.itemId },
      });
      if (item) {
        isOwner = item.createdById === user.id;
        if (item.isGeneral) {
          return NextResponse.json(
            { error: 'El producto ya es público' },
            { status: 400 }
          );
        }
      }
    } else if (validatedData.itemType === 'article') {
      item = await prisma.article.findUnique({
        where: { id: validatedData.itemId },
      });
      if (item) {
        isOwner = item.createdById === user.id;
        if (item.isGeneral) {
          return NextResponse.json(
            { error: 'El artículo ya es público' },
            { status: 400 }
          );
        }
      }
    } else if (validatedData.itemType === 'ingredient') {
      item = await prisma.ingredient.findUnique({
        where: { id: validatedData.itemId },
      });
      // Los ingredientes no tienen isGeneral, pero verificamos que existe
      if (item) {
        // Para ingredientes, verificamos si el usuario tiene permisos para gestionarlos
        // o si fue creado por ellos (aunque no hay campo createdById, asumimos que pueden solicitarlo)
        isOwner = true; // Por ahora permitimos a todos los usuarios autenticados
      }
    }

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    if (!isOwner && validatedData.itemType !== 'ingredient') {
      return NextResponse.json(
        { error: 'Solo el creador del item puede solicitar su incorporación pública' },
        { status: 403 }
      );
    }

    // Crear la solicitud
    const inclusionRequest = await prisma.publicInclusionRequest.create({
      data: {
        itemType: validatedData.itemType,
        itemId: validatedData.itemId,
        requestedById: user.id,
        status: 'pending',
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        request: {
          id: inclusionRequest.id,
          itemType: inclusionRequest.itemType,
          itemId: inclusionRequest.itemId,
          status: inclusionRequest.status,
          createdAt: inclusionRequest.createdAt,
          requestedBy: inclusionRequest.requestedBy,
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
    console.error('Error in POST /api/public-inclusion/request:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

