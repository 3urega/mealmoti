'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  createdAt?: string | Date;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      } else {
        setError(data.error || 'Error al cargar el perfil');
        router.push('/login');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obtener inicial del nombre
  const getInitial = () => {
    if (!user?.name) return '?';
    return user.name.charAt(0).toUpperCase();
  };

  // Formatear fecha
  const formatDate = (date?: string | Date) => {
    if (!date) return 'No disponible';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Obtener nombre del rol en español
  const getRoleName = (role?: string) => {
    if (!role) return 'Usuario';
    const roleNames: Record<string, string> = {
      superadmin: 'Super Administrador',
      admin: 'Administrador',
      recetas: 'Gestor de Recetas',
      productos: 'Gestor de Productos',
      user: 'Usuario',
    };
    return roleNames[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Cargando perfil...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error || 'Usuario no encontrado'}</p>
          <Link
            href="/app"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header del perfil */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Perfil</h1>
        <p className="text-gray-600">Gestiona tu información personal</p>
      </div>

      {/* Avatar y información principal */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="px-6 py-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full bg-blue-600 text-white text-3xl font-medium flex items-center justify-center shadow-md">
                {getInitial()}
              </div>
            </div>

            {/* Información del usuario */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                {user.name}
              </h2>
              <p className="text-gray-600 mb-3">{user.email}</p>
              {user.role && (
                <div className="inline-flex items-center">
                  <span className="inline-flex rounded-full px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-800">
                    {getRoleName(user.role)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Información detallada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información Personal */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Información Personal
            </h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <p className="text-gray-900">{user.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            {user.role && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <p className="text-gray-900">{getRoleName(user.role)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Información de la cuenta */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Información de la Cuenta
            </h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID de Usuario
              </label>
              <p className="text-sm text-gray-600 font-mono break-all">
                {user.id}
              </p>
            </div>
            {user.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de registro
                </label>
                <p className="text-gray-900">{formatDate(user.createdAt)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Acciones</h3>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-3">
            <Link
              href="/app"
              className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Volver al Dashboard
            </Link>
            <Link
              href="/app/dashboard"
              className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Ver mis listas
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

