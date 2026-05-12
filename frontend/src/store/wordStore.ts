import { create } from 'zustand'
import { wordApi } from '../services/word'
import type { Word, WordListFilters, WordPayload } from '../types/word'

type WordState = {
  items: Word[]
  loading: boolean
  error: string
  fetchAll: (filters?: WordListFilters) => Promise<void>
  create: (payload: WordPayload) => Promise<void>
  update: (id: number, payload: WordPayload) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useWordStore = create<WordState>((set, get) => ({
  items: [],
  loading: false,
  error: '',
  fetchAll: async (filters) => {
    try {
      set({ loading: true, error: '' })
      set({ items: await wordApi.list(filters), loading: false })
    } catch (error) {
      set({ loading: false, error: (error as Error).message })
    }
  },
  create: async (payload) => {
    try {
      await wordApi.create(payload)
      await get().fetchAll()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },
  update: async (id, payload) => {
    try {
      await wordApi.update(id, payload)
      await get().fetchAll()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },
  remove: async (id) => {
    try {
      await wordApi.remove(id)
      await get().fetchAll()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },
}))
