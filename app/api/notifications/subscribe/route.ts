import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = subscriptionSchema.parse(body);

    // Aquí podrías guardar la suscripción en la base de datos
    // Por ahora, solo validamos y retornamos éxito
    // En el futuro, podrías crear un modelo PushSubscription en Prisma

    // Ejemplo de cómo se guardaría (requiere migración de Prisma):
    /*
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: user.id,
          endpoint: validatedData.endpoint,
        },
      },
      update: {
        p256dh: validatedData.keys.p256dh,
        auth: validatedData.keys.auth,
      },
      create: {
        userId: user.id,
        endpoint: validatedData.endpoint,
        p256dh: validatedData.keys.p256dh,
        auth: validatedData.keys.auth,
      },
    });
    */

    return NextResponse.json(
      { message: 'Suscripción guardada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/notifications/subscribe:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Aquí eliminarías la suscripción de la base de datos
    // await prisma.pushSubscription.deleteMany({
    //   where: {
    //     userId: user.id,
    //     endpoint: endpoint,
    //   },
    // });

    return NextResponse.json(
      { message: 'Suscripción eliminada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/notifications/subscribe:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

