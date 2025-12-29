import { getSession } from './session';
import { prisma } from './prisma';

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
} | null> {
  try {
    const userId = await getSession();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}


