import Link from 'next/link';
import Header from '@/components/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Mealmoti
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Crea y comparte listas de la compra con tu familia y amigos.
            Organiza tus compras de manera sencilla y colaborativa.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/register"
              className="rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Comenzar
            </Link>
            <Link
              href="/login"
              className="text-base font-semibold leading-7 text-gray-900"
            >
              Ya tengo cuenta <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="mt-24">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="rounded-lg bg-white p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">
                  Crea Listas
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Crea listas de la compra personalizadas con todos los items
                  que necesitas.
                </p>
              </div>
              <div className="rounded-lg bg-white p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">
                  Comparte
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Comparte tus listas con otros usuarios y colabora en tiempo
                  real.
                </p>
              </div>
              <div className="rounded-lg bg-white p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">
                  Organiza
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Marca items como completados y mantén todo organizado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
