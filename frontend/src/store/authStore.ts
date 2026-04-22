import { create } from 'zustand'
import { authApi } from '../services/auth'
import type { LoginPayload, RegisterPayload, ResetPasswordPayload, User } from '../types/auth'

type AuthState = {
  user: User | null
  token: string
  loading: boolean
  error: string
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => void
}

const token = localStorage.getItem('token') ?? ''

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token,
  loading: false,
  error: '',
  login: async (payload) => {
    set({ loading: true, error: '' })
    try {
      const result = await authApi.login(payload)
      localStorage.setItem('token', result.token)
      set({ token: result.token, user: result.user, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },
  register: async (payload) => {
    set({ loading: true, error: '' })
    try {
      const result = await authApi.register(payload)
      localStorage.setItem('token', result.token)
      set({ token: result.token, user: result.user, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },
  resetPassword: async (payload) => {
    set({ loading: true, error: '' })
    try {
      await authApi.resetPassword(payload)
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },
  fetchMe: async () => {
    if (!localStorage.getItem('token')) return
    try {
      set({ user: await authApi.me() })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: '' })
    }
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: '', error: '' })
  },
}))
