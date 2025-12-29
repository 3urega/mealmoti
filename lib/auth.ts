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


