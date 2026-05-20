import type { PermissionSnapshot, UserRoleView } from '../types/permission'
import { request } from '../utils/request'

export const permissionService = {
  snapshot: () =>
    request<PermissionSnapshot>({
      url: '/permissions',
    }),
  listUserRoles: () =>
    request<UserRoleView[]>({
      url: '/users/roles',
    }),
  updateUserRole: (userID: number, roleID: number) =>
    request<boolean>({
      url: `/users/${userID}/role`,
      method: 'PUT',
      data: { role_id: roleID },
    }),
  deleteUser: (userID: number) =>
    request<boolean>({
      url: `/users/${userID}`,
      method: 'DELETE',
    }),
  updateRolePermissions: (roleID: number, permissionIDs: number[]) =>
    request<boolean>({
      url: `/roles/${roleID}/permissions`,
      method: 'PUT',
      data: { permission_ids: permissionIDs },
    }),
}
