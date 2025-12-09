import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/get-session';
import Header from '@/components/Header';
import { NotificationProvider } from '@/contexts/NotificationContext';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </NotificationProvider>
  );
}



