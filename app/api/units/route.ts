import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const units = await prisma.unit.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        symbol: true,
        description: true,
      },
    });

    return NextResponse.json({ units }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/units:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
