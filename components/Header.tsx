'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import UserMenu from './UserMenu';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCatalogMenu, setShowCatalogMenu] = useState(false);
  const [showManagementMenu, setShowManagementMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const catalogMenuRef = useRef<HTMLDivElement>(null);
  const managementMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Verificar si el usuario es admin o superadmin
  const isAdminUser = user?.role === 'admin' || user?.role === 'superadmin';

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        catalogMenuRef.current &&
        !catalogMenuRef.current.contains(event.target as Node)
      ) {
        setShowCatalogMenu(false);
      }
      if (
        managementMenuRef.current &&
        !managementMenuRef.current.contains(event.target as Node)
      ) {
        setShowManagementMenu(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-mobile-menu-button]')
      ) {
        setShowMobileMenu(false);
      }
    }

    if (showCatalogMenu || showManagementMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCatalogMenu, showManagementMenu, showMobileMenu]);

  // Prevenir scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileMenu]);

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
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Mealmoti
            </Link>
            
            {/* Menú Desktop - oculto en mobile */}
            <nav className="hidden md:flex items-center gap-4">
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
                  {isAdminUser && (
                    <div className="relative" ref={managementMenuRef}>
                      <button
                        onClick={() => setShowManagementMenu(!showManagementMenu)}
                        className="text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        Gestión
                        <svg
                          className={`ml-1 inline-block h-4 w-4 transition-transform ${
                            showManagementMenu ? 'rotate-180' : ''
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
                      {showManagementMenu && (
                        <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
                          <div className="py-1">
                            <Link
                              href="/app/users"
                              onClick={() => setShowManagementMenu(false)}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Usuarios
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                  <Link
                    href="/app/statistics"
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Estadísticas
                  </Link>
                  <UserMenu user={user} />
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

            {/* Botón hamburguesa - solo visible en mobile */}
            {user && (
              <button
                data-mobile-menu-button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Abrir menú"
              >
                {showMobileMenu ? (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            )}

            {/* Botones de login/register en mobile cuando no hay usuario */}
            {!user && (
              <div className="md:hidden flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar móvil */}
      {showMobileMenu && user && (
        <>
          {/* Overlay oscuro */}
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Sidebar */}
          <div
            ref={mobileMenuRef}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl md:hidden transform transition-transform duration-300 ease-in-out"
          >
            <div className="flex h-full flex-col">
              {/* Header del sidebar */}
              <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
                <span className="text-lg font-semibold text-gray-900">Menú</span>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
                  aria-label="Cerrar menú"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Contenido del sidebar */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-1">
                  <Link
                    href="/app"
                    onClick={() => setShowMobileMenu(false)}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Mi App
                  </Link>
                  <Link
                    href="/app/dashboard"
                    onClick={() => setShowMobileMenu(false)}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Dashboard
                  </Link>
                  
                  {/* Catálogo expandible */}
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Catálogo
                    </div>
                    <Link
                      href="/app/ingredients"
                      onClick={() => setShowMobileMenu(false)}
                      className="block rounded-md px-6 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Ingredientes
                    </Link>
                    <Link
                      href="/app/products"
                      onClick={() => setShowMobileMenu(false)}
                      className="block rounded-md px-6 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Productos
                    </Link>
                    <Link
                      href="/app/product-families"
                      onClick={() => setShowMobileMenu(false)}
                      className="block rounded-md px-6 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Familias
                    </Link>
                    <Link
                      href="/app/articles"
                      onClick={() => setShowMobileMenu(false)}
                      className="block rounded-md px-6 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Artículos
                    </Link>
                  </div>

                  {/* Gestión - solo para admin y superadmin */}
                  {isAdminUser && (
                    <div className="space-y-1">
                      <div className="px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Gestión
                      </div>
                      <Link
                        href="/app/users"
                        onClick={() => setShowMobileMenu(false)}
                        className="block rounded-md px-6 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Usuarios
                      </Link>
                    </div>
                  )}

                  <Link
                    href="/app/stores"
                    onClick={() => setShowMobileMenu(false)}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Comercios
                  </Link>
                  <Link
                    href="/app/recipes"
                    onClick={() => setShowMobileMenu(false)}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Recetas
                  </Link>
                  <Link
                    href="/app/statistics"
                    onClick={() => setShowMobileMenu(false)}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Estadísticas
                  </Link>
                </div>
              </div>

              {/* Footer del sidebar con usuario y logout */}
              <div className="border-t border-gray-200 px-4 py-4">
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/app/profile"
                    onClick={() => setShowMobileMenu(false)}
                    className="block w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 text-center"
                  >
                    Perfil
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMobileMenu(false);
                    }}
                    className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}


