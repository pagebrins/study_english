import { create } from 'zustand'
import { themeApi } from '../services/theme'
import type { Theme, ThemePayload } from '../types/theme'

type ThemeState = {
  allItems: Theme[]
  loading: boolean
  error: string
  fetchAll: () => Promise<void>
  create: (payload: ThemePayload) => Promise<void>
  update: (id: number, payload: ThemePayload) => Promise<void>
  remove: (id: number) => Promise<void>
}

const loadAllThemes = async () => {
  return themeApi.list({ all: true })
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  allItems: [],
  loading: false,
  error: '',
  fetchAll: async () => {
    try {
      set({ loading: true, error: '' })
      set({ allItems: await loadAllThemes(), loading: false })
    } catch (error) {
      set({ loading: false, error: (error as Error).message })
    }
  },
  create: async (payload) => {
    try {
      await themeApi.create(payload)
      await get().fetchAll()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  update: async (id, payload) => {
    try {
      await themeApi.update(id, payload)
      await get().fetchAll()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  remove: async (id) => {
    try {
      await themeApi.remove(id)
      await get().fetchAll()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
}))
