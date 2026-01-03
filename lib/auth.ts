import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Jerarquía de roles (de mayor a menor privilegio)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 5,
  admin: 4,
  recetas: 3,
  productos: 2,
  user: 1,
};

/**
 * Verifica si un usuario tiene un rol específico o superior
 */
export function hasRole(userRole: UserRole | string, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
}

/**
 * Verifica si un usuario tiene exactamente un rol específico
 */
export function isRole(userRole: UserRole | string, role: UserRole): boolean {
  return userRole === role;
}

/**
 * Verifica si un usuario tiene alguno de los roles especificados
 */
export function hasAnyRole(userRole: UserRole | string, roles: UserRole[]): boolean {
  return roles.some(role => userRole === role);
}

/**
 * Verifica si un usuario es superadmin
 */
export function isSuperAdmin(userRole: UserRole | string): boolean {
  return userRole === 'superadmin';
}

/**
 * Verifica si un usuario es admin o superadmin
 */
export function isAdmin(userRole: UserRole | string): boolean {
  return hasRole(userRole, 'admin');
}

/**
 * Verifica si un usuario puede gestionar recetas
 */
export function canManageRecipes(userRole: UserRole | string): boolean {
  return hasRole(userRole, 'recetas');
}

/**
 * Verifica si un usuario puede gestionar productos
 */
export function canManageProducts(userRole: UserRole | string): boolean {
  return hasRole(userRole, 'productos');
}

/**
 * Verifica si un usuario puede crear o editar items públicos (isGeneral: true)
 * Solo usuarios con roles superiores a "user" pueden crear items públicos
 */
export function canCreatePublicItems(userRole: UserRole | string): boolean {
  // Solo usuarios con rol superior a "user" pueden crear items públicos
  return hasRole(userRole, 'productos');
}

/**
 * Verifica si un usuario puede revisar solicitudes de incorporación pública
 * Solo usuarios con roles de productos o superiores pueden revisar
 */
export function canReviewInclusionRequests(userRole: UserRole | string): boolean {
  return hasRole(userRole, 'productos');
}

/**
 * Verifica si un usuario puede gestionar el catálogo (productos, familias, tags, artículos)
 * Solo usuarios con rol "productos" o superior pueden crear/modificar/eliminar elementos del catálogo
 */
export function canManageCatalog(userRole: UserRole | string): boolean {
  return hasRole(userRole, 'productos');
}

/**
 * Verifica si un usuario puede ver el catálogo (solo lectura)
 * Todos los usuarios autenticados pueden ver el catálogo
 */
export function canViewCatalog(userRole: UserRole | string): boolean {
  // Todos los usuarios autenticados pueden ver el catálogo
  return true;
}

/**
 * Verifica si un usuario puede gestionar comercios/stores
 * Solo usuarios con rol "productos" o superior pueden crear/modificar/eliminar comercios
 */
export function canManageStores(userRole: UserRole | string): boolean {
  return hasRole(userRole, 'productos');
}


