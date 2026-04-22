export type Role = {
  id: number
  code: string
  name: string
  description?: string
}

export type Permission = {
  id: number
  code: string
  name: string
  description?: string
}

export type RolePermission = {
  id: number
  role_id: number
  permission_id: number
}

export type PermissionSnapshot = {
  roles: Role[]
  permissions: Permission[]
  role_permissions: RolePermission[]
}

export type UserRoleView = {
  user_id: number
  email: string
  name: string
  role_id: number
  role_code: string
  role_name: string
}

