import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/get-session';
import Header from '@/components/Header';
import KitchenIconsBackground from '@/components/KitchenIconsBackground';
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
      <div className="relative min-h-screen bg-gray-50">
        <Header />
        <div className="flex min-h-[calc(100vh-4rem)]">
          <aside className="hidden md:flex w-28 xl:w-36 flex-col items-center justify-evenly py-16 shrink-0 text-amber-600/50">
            <KitchenIconsBackground />
          </aside>
          <main className="flex-1 min-w-0 max-w-screen-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <aside className="hidden md:flex w-28 xl:w-36 flex-col items-center justify-evenly py-16 shrink-0 text-amber-600/50">
            <KitchenIconsBackground />
          </aside>
        </div>
      </div>
    </NotificationProvider>
  );
}



