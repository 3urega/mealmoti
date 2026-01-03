import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const nearbyStoresSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive().optional().default(10), // Radio en kilómetros
  limit: z.number().int().positive().max(50).optional().default(20),
});

// Fórmula de Haversine para calcular distancia entre dos puntos en la Tierra
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude') || '');
    const longitude = parseFloat(searchParams.get('longitude') || '');
    const radius = parseFloat(searchParams.get('radius') || '10');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Validar parámetros
    const validatedData = nearbyStoresSchema.parse({
      latitude,
      longitude,
      radius,
      limit,
    });

    // Obtener todos los comercios accesibles (generales o del usuario)
    const stores = await prisma.store.findMany({
      where: {
        OR: [
          { isGeneral: true },
          { createdById: user.id },
        ],
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        latitude: true,
        longitude: true,
        isGeneral: true,
        createdById: true,
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    // Calcular distancia y filtrar por radio
    const storesWithDistance = stores
      .map((store) => {
        if (!store.latitude || !store.longitude) return null;
        
        const distance = calculateDistance(
          validatedData.latitude,
          validatedData.longitude,
          store.latitude,
          store.longitude
        );

        return {
          ...store,
          distance,
        };
      })
      .filter((store) => store !== null && store.distance <= validatedData.radius) as Array<
      typeof stores[0] & { distance: number }
    >;

    // Ordenar por distancia
    storesWithDistance.sort((a, b) => a.distance - b.distance);

    // Limitar resultados
    const limitedStores = storesWithDistance.slice(0, validatedData.limit);

    // Formatear respuesta
    const formattedStores = limitedStores.map((store) => ({
      id: store.id,
      name: store.name,
      type: store.type,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      isGeneral: store.isGeneral,
      createdById: store.createdById,
      distance: Math.round(store.distance * 10) / 10, // Redondear a 1 decimal
      articlesCount: store._count.articles,
    }));

    return NextResponse.json(
      {
        stores: formattedStores,
        count: formattedStores.length,
        radius: validatedData.radius,
        center: {
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
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
    console.error('Error in GET /api/stores/nearby:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

