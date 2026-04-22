import { create } from 'zustand'
import { questionApi } from '../services/question'
import type { GeneratedQuestionList, QuestionListFilters, QuestionPayload, UserQuestion } from '../types/question'

type QuestionState = {
  generated: GeneratedQuestionList
  generatedModeId: number
  generating: boolean
  streamPreview: string
  items: UserQuestion[]
  lastFilters: QuestionListFilters
  error: string
  generate: (mode_id: number) => Promise<void>
  generateStream: (mode_id: number) => Promise<void>
  fetch: (filters?: QuestionListFilters) => Promise<void>
  create: (payload: QuestionPayload) => Promise<void>
  update: (id: number, payload: QuestionPayload) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
  generated: [],
  generatedModeId: 0,
  generating: false,
  streamPreview: '',
  items: [],
  lastFilters: {},
  error: '',
  generate: async (mode_id) => {
    try {
      set({ generating: true, streamPreview: '', error: '' })
      const items = await questionApi.generate(mode_id)
      set({ generated: items, generatedModeId: mode_id, generating: false, error: '' })
    } catch (error) {
      set({ error: (error as Error).message, generated: [], generatedModeId: 0, generating: false })
    }
  },
  generateStream: async (mode_id) => {
    try {
      set({ generating: true, streamPreview: '', error: '' })
      const items = await questionApi.generateStream(mode_id, {
        onToken: (token) =>
          set((state) => ({
            streamPreview: state.streamPreview + token,
          })),
      })
      set({
        generated: items,
        generatedModeId: mode_id,
        generating: false,
      })
    } catch (error) {
      set({
        error: (error as Error).message,
        generating: false,
        streamPreview: '',
      })
      throw error
    }
  },
  fetch: async (filters) => {
    const appliedFilters = filters ?? get().lastFilters
    try {
      set({ items: await questionApi.list(appliedFilters), lastFilters: appliedFilters, error: '' })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  create: async (payload) => {
    try {
      await questionApi.create(payload)
      await get().fetch()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  update: async (id, payload) => {
    try {
      await questionApi.update(id, payload)
      await get().fetch()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  remove: async (id) => {
    try {
      await questionApi.remove(id)
      await get().fetch()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
}))
