import type { User } from '../types/auth'

export const isAdminUser = (user: User | null) => user?.role_code === 'admin'
