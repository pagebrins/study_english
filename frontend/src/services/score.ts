import { getResult, http } from './http'

export type TodayScore = { score: number; total: number; answered: number }
export type ScoreFilters = { type?: number; mode?: number }

export const scoreApi = {
  today: (filters?: ScoreFilters) =>
    getResult<TodayScore>(
      http.get('/scores/today', {
        params: {
          type: filters?.type,
          mode: filters?.mode,
        },
      }),
    ),
  recalculate: (filters?: ScoreFilters) =>
    getResult<TodayScore>(
      http.post('/scores/recalculate', undefined, {
        params: {
          type: filters?.type,
          mode: filters?.mode,
        },
      }),
    ),
}
