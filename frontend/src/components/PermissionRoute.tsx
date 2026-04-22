import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { hasPermission } from '../utils/permission'

type Props = PropsWithChildren<{
  permission?: string
  permissions?: string[]
}>

export const PermissionRoute = ({ permission, permissions, children }: Props) => {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/auth" replace />
  if (!user) return children
  const required = permission ? [permission] : (permissions ?? [])
  if (required.length > 0 && !required.some((item) => hasPermission(user, item))) {
    return <Navigate to="/" replace />
  }
  return children
}

