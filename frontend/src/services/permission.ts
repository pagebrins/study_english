import type { PermissionSnapshot, UserRoleView } from '../types/permission'
import { getResult, http } from './http'

export const permissionApi = {
  snapshot: () => getResult<PermissionSnapshot>(http.get('/permissions')),
  listUserRoles: () => getResult<UserRoleView[]>(http.get('/users/roles')),
  updateUserRole: (userID: number, roleID: number) =>
    getResult<boolean>(http.put(`/users/${userID}/role`, { role_id: roleID })),
  updateRolePermissions: (roleID: number, permissionIDs: number[]) =>
    getResult<boolean>(http.put(`/roles/${roleID}/permissions`, { permission_ids: permissionIDs })),
}

