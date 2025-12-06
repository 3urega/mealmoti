import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assignStoreSchema = z.object({
  storeId: z.string().min(1, 'El comercio es requerido'),
  price: z.number().positive('El precio debe ser positivo').optional().nullable(),
  available: z.boolean().default(true),
});

async function hasAccessToArticle(
  userId: string,
  articleId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    return { hasAccess: false, isOwner: false };
  }

  const isOwner = article.createdById === userId;
  const isGeneral = article.isGeneral;
  const hasAccess = isGeneral || isOwner;

  return { hasAccess, isOwner };
}

async function hasAccessToStore(
  userId: string,
  storeId: string
): Promise<{ hasAccess: boolean }> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    return { hasAccess: false };
  }

  const isGeneral = store.isGeneral;
  const isOwner = store.createdById === userId;
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
    const { hasAccess } = await hasAccessToArticle(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    const articleStores = await prisma.articleStore.findMany({
      where: { articleId: id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
          },
        },
      },
      orderBy: {
        store: {
          name: 'asc',
        },
      },
    });

    const stores = articleStores.map((as: typeof articleStores[0]) => ({
      id: as.store.id,
      name: as.store.name,
      type: as.store.type,
      address: as.store.address,
      price: as.price,
      available: as.available,
      lastCheckedAt: as.lastCheckedAt,
    }));

    return NextResponse.json({ stores }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/articles/[id]/stores:', error);
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
    const { hasAccess, isOwner } = await hasAccessToArticle(user.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Artículo no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Si es particular, solo el creador puede modificar
    if (!isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este artículo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = assignStoreSchema.parse(body);

    // Verificar que el comercio existe y el usuario tiene acceso
    const { hasAccess: hasStoreAccess } = await hasAccessToStore(
      user.id,
      validatedData.storeId
    );

    if (!hasStoreAccess) {
      return NextResponse.json(
        { error: 'Comercio no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // Verificar si la relación ya existe
    const existing = await prisma.articleStore.findUnique({
      where: {
        articleId_storeId: {
          articleId: id,
          storeId: validatedData.storeId,
        },
      },
    });

    let articleStore;

    if (existing) {
      // Actualizar relación existente
      articleStore = await prisma.articleStore.update({
        where: {
          id: existing.id,
        },
        data: {
          price: validatedData.price ?? null,
          available: validatedData.available,
        },
        include: {
          article: {
            select: {
              id: true,
              name: true,
              brand: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } else {
      // Crear nueva relación
      articleStore = await prisma.articleStore.create({
        data: {
          articleId: id,
          storeId: validatedData.storeId,
          price: validatedData.price ?? null,
          available: validatedData.available,
        },
        include: {
          article: {
            select: {
              id: true,
              name: true,
              brand: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    return NextResponse.json(
      {
        articleStore: {
          id: articleStore.id,
          article: articleStore.article,
          store: articleStore.store,
          price: articleStore.price,
          available: articleStore.available,
          lastCheckedAt: articleStore.lastCheckedAt,
        },
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/articles/[id]/stores:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}


