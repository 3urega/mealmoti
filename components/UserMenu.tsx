'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface UserMenuProps {
  user: User;
}

export default function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Obtener inicial del nombre
  const getInitial = () => {
    if (!user.name) return '?';
    return user.name.charAt(0).toUpperCase();
  };

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        aria-label="Menú de usuario"
        aria-expanded={showMenu}
      >
        {getInitial()}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg z-50">
          <div className="py-1">
            {/* Información del usuario */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
              {user.role && (
                <div className="mt-1">
                  <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800">
                    {user.role}
                  </span>
                </div>
              )}
            </div>

            {/* Opciones del menú */}
            <Link
              href="/app/profile"
              onClick={() => setShowMenu(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Perfil
            </Link>
            <button
              onClick={() => {
                setShowMenu(false);
                handleLogout();
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

