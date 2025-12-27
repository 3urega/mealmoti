'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCatalogMenu, setShowCatalogMenu] = useState(false);
  const catalogMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        catalogMenuRef.current &&
        !catalogMenuRef.current.contains(event.target as Node)
      ) {
        setShowCatalogMenu(false);
      }
    }

    if (showCatalogMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCatalogMenu]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  if (loading) {
    return (
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="text-xl font-bold text-gray-900">Mealmoti</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Mealmoti
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/app"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Mi App
                </Link>
                <Link
                  href="/app/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                <div className="relative" ref={catalogMenuRef}>
                  <button
                    onClick={() => setShowCatalogMenu(!showCatalogMenu)}
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Catálogo
                    <svg
                      className={`ml-1 inline-block h-4 w-4 transition-transform ${
                        showCatalogMenu ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {showCatalogMenu && (
                    <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
                      <div className="py-1">
                        <Link
                          href="/app/ingredients"
                          onClick={() => setShowCatalogMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Ingredientes
                        </Link>
                        <Link
                          href="/app/products"
                          onClick={() => setShowCatalogMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Productos
                        </Link>
                        <Link
                          href="/app/product-families"
                          onClick={() => setShowCatalogMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Familias
                        </Link>
                        <Link
                          href="/app/articles"
                          onClick={() => setShowCatalogMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Artículos
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                <Link
                  href="/app/stores"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Comercios
                </Link>
                <Link
                  href="/app/recipes"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Recetas
                </Link>
                <span className="text-sm text-gray-600">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Registrarse
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}


