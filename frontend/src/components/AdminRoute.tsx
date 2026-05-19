import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isAdminUser } from '../utils/auth'

export const AdminRoute = ({ children }: PropsWithChildren) => {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/auth" replace />
  if (!user) return children
  if (!isAdminUser(user)) return <Navigate to="/dashboard" replace />
  return children
}
