import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { canReviewInclusionRequests } from '@/lib/auth';
import { z } from 'zod';

const reviewRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
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

    // Validar que el usuario puede revisar solicitudes
    if (!canReviewInclusionRequests(user.role)) {
      return NextResponse.json(
        { error: 'No tienes permiso para revisar solicitudes' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = reviewRequestSchema.parse(body);

    // Verificar que la solicitud existe y está pendiente
    const inclusionRequest = await prisma.publicInclusionRequest.findUnique({
      where: { id },
    });

    if (!inclusionRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    if (inclusionRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Solo se pueden revisar solicitudes pendientes' },
        { status: 400 }
      );
    }

    if (validatedData.action === 'approve') {
      // Aprobar: convertir el item en público
      if (inclusionRequest.itemType === 'product') {
        const product = await prisma.product.findUnique({
          where: { id: inclusionRequest.itemId },
        });

        if (!product) {
          return NextResponse.json(
            { error: 'Producto no encontrado' },
            { status: 404 }
          );
        }

        if (product.isGeneral) {
          return NextResponse.json(
            { error: 'El producto ya es público' },
            { status: 400 }
          );
        }

        // Actualizar producto a público
        await prisma.product.update({
          where: { id: inclusionRequest.itemId },
          data: {
            isGeneral: true,
            createdById: null,
          },
        });
      } else if (inclusionRequest.itemType === 'article') {
        const article = await prisma.article.findUnique({
          where: { id: inclusionRequest.itemId },
        });

        if (!article) {
          return NextResponse.json(
            { error: 'Artículo no encontrado' },
            { status: 404 }
          );
        }

        if (article.isGeneral) {
          return NextResponse.json(
            { error: 'El artículo ya es público' },
            { status: 400 }
          );
        }

        // Actualizar artículo a público
        await prisma.article.update({
          where: { id: inclusionRequest.itemId },
          data: {
            isGeneral: true,
            createdById: null,
          },
        });
      } else if (inclusionRequest.itemType === 'ingredient') {
        // Los ingredientes no tienen isGeneral, pero podemos verificar que existe
        const ingredient = await prisma.ingredient.findUnique({
          where: { id: inclusionRequest.itemId },
        });

        if (!ingredient) {
          return NextResponse.json(
            { error: 'Ingrediente no encontrado' },
            { status: 404 }
          );
        }

        // Para ingredientes, simplemente marcamos como aprobado
        // (no hay campo isGeneral que cambiar)
      }

      // Actualizar la solicitud como aprobada
      const updatedRequest = await prisma.publicInclusionRequest.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedById: user.id,
          reviewedAt: new Date(),
          notes: validatedData.notes || null,
        },
        include: {
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewedBy: {
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
          request: updatedRequest,
          message: 'Solicitud aprobada correctamente',
        },
        { status: 200 }
      );
    } else {
      // Rechazar: solo actualizar el status
      const updatedRequest = await prisma.publicInclusionRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedById: user.id,
          reviewedAt: new Date(),
          notes: validatedData.notes || null,
        },
        include: {
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewedBy: {
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
          request: updatedRequest,
          message: 'Solicitud rechazada correctamente',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/public-inclusion/[id]/review:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

