import type {
  ExplainChatPayload,
  ExplainChatResponse,
  GeneratedQuestion,
  UserQuestion,
} from '../types/question'
import { request } from '../utils/request'

export const questionService = {
  generate: (modeID: number) =>
    request<GeneratedQuestion[]>({
      url: '/questions/generate',
      method: 'POST',
      data: { mode_id: modeID },
    }),
  analyze: (payload: { mode_id: number; question: string; answer_text: string; answer_key: string }) =>
    request<string[]>({
      url: '/questions/analyze',
      method: 'POST',
      data: payload,
    }),
  create: (payload: {
    mode_id: number
    question: string
    answer_key: string
    answer_text: string
    score: number
    pre_generated_id?: number
  }) =>
    request<UserQuestion>({
      url: '/questions',
      method: 'POST',
      data: payload,
    }),
  list: (filters: {
    type?: number
    mode_ids?: number[]
    min_score?: number
    max_score?: number
    start_date?: string
    end_date?: string
  }) => {
    const query = [
      filters.type ? `type=${filters.type}` : '',
      filters.mode_ids?.length ? `mode_ids=${filters.mode_ids.join(',')}` : '',
      filters.min_score !== undefined ? `min_score=${filters.min_score}` : '',
      filters.max_score !== undefined ? `max_score=${filters.max_score}` : '',
      filters.start_date ? `start_date=${encodeURIComponent(filters.start_date)}` : '',
      filters.end_date ? `end_date=${encodeURIComponent(filters.end_date)}` : '',
    ]
      .filter(Boolean)
      .join('&')
    return request<UserQuestion[]>({
      url: `/questions${query ? `?${query}` : ''}`,
    })
  },
  explainChat: (payload: ExplainChatPayload) =>
    request<ExplainChatResponse>({
      url: '/questions/explain/chat',
      method: 'POST',
      data: payload,
    }),
}
