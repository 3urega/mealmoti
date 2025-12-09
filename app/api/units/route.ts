import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const units = await prisma.unit.findMany({
      orderBy: {
        name: 'asc',
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

