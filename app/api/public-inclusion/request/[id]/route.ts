import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

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

    // Verificar que la solicitud existe
    const inclusionRequest = await prisma.publicInclusionRequest.findUnique({
      where: { id },
    });

    if (!inclusionRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    // Validar que el usuario es el creador de la solicitud
    if (inclusionRequest.requestedById !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para cancelar esta solicitud' },
        { status: 403 }
      );
    }

    // Validar que el status es pending
    if (inclusionRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Solo se pueden cancelar solicitudes pendientes' },
        { status: 400 }
      );
    }

    // Eliminar la solicitud
    await prisma.publicInclusionRequest.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Solicitud cancelada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/public-inclusion/request/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

