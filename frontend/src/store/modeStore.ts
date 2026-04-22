import { create } from 'zustand'
import { modeApi } from '../services/mode'
import type { ModeListFilters, ModePayload, StudyMode } from '../types/mode'

type ModeState = {
  items: StudyMode[]
  lastFilters: ModeListFilters
  error: string
  fetch: (filters?: ModeListFilters) => Promise<void>
  create: (payload: ModePayload) => Promise<void>
  update: (id: number, payload: ModePayload) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useModeStore = create<ModeState>((set, get) => ({
  items: [],
  lastFilters: {},
  error: '',
  fetch: async (filters) => {
    const appliedFilters = filters ?? get().lastFilters
    try {
      set({ items: await modeApi.list(appliedFilters), lastFilters: appliedFilters, error: '' })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  create: async (payload) => {
    try {
      await modeApi.create(payload)
      await get().fetch()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  update: async (id, payload) => {
    try {
      await modeApi.update(id, payload)
      await get().fetch()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  remove: async (id) => {
    try {
      await modeApi.remove(id)
      await get().fetch()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
}))
