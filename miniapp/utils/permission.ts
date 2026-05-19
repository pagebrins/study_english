import type { AuthUser } from '../types/auth'

export const hasPermission = (user: AuthUser | null, permissionCode: string) =>
  Boolean(user?.permissions?.includes(permissionCode))

export const hasAnyPermission = (user: AuthUser | null, permissionCodes: string[]) =>
  permissionCodes.some((permissionCode) => hasPermission(user, permissionCode))

export const isAdmin = (user: AuthUser | null) => user?.role_code === 'admin'
