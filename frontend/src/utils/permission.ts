import type { User } from '../types/auth'

export const hasPermission = (user: User | null, permissionCode: string) => {
  if (!user) return false
  const permissions = user.permissions ?? []
  return permissions.includes(permissionCode)
}

