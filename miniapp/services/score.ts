import { request } from '../utils/request'

export type TodayScore = {
  score: number
  total: number
  answered: number
}

export const scoreService = {
  today: (type?: number) =>
    request<TodayScore>({
      url: `/scores/today${type ? `?type=${type}` : ''}`,
    }),
}
