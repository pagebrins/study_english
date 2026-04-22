import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Guard routes requiring login.
 */
export const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const { token } = useAuth()
  if (!token) return <Navigate to="/auth" replace />
  return children
}
