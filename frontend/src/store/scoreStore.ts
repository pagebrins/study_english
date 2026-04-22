import { create } from 'zustand'
import { scoreApi, type ScoreFilters, type TodayScore } from '../services/score'

type ScoreState = {
  today: TodayScore | null
  lastFilters: ScoreFilters
  error: string
  fetch: (filters?: ScoreFilters) => Promise<void>
  recalculate: (filters?: ScoreFilters) => Promise<void>
}

export const useScoreStore = create<ScoreState>((set) => ({
  today: null,
  lastFilters: {},
  error: '',
  fetch: async (filters) => {
    const appliedFilters = filters ?? {}
    try {
      set({ today: await scoreApi.today(appliedFilters), lastFilters: appliedFilters, error: '' })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  recalculate: async (filters) => {
    const appliedFilters = filters ?? {}
    try {
      set({ today: await scoreApi.recalculate(appliedFilters), lastFilters: appliedFilters, error: '' })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
}))
