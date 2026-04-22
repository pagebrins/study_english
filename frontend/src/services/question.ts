import type {
  AnswerIssueList,
  ExplainChatPayload,
  ExplainChatResponse,
  GeneratedQuestionList,
  QuestionListFilters,
  QuestionPayload,
  UserQuestion,
} from '../types/question'
import { getResult, http } from './http'

type StreamHandlers = {
  onToken?: (token: string) => void
  onMeta?: (meta: { retry_round: number; raw_generated_count: number; filtered_count: number; final_count: number }) => void
  onFinal?: (items: GeneratedQuestionList) => void
}

const parseSSEBlock = (block: string): { event: string; data: string } | null => {
  const lines = block.split('\n')
  let event = 'message'
  const data: string[] = []
  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      data.push(line.slice('data:'.length).trim())
    }
  }
  if (!data.length) return null
  return { event, data: data.join('\n') }
}

export const questionApi = {
  generate: (mode_id: number) =>
    getResult<GeneratedQuestionList>(http.post('/questions/generate', { mode_id })),
  generateStream: async (mode_id: number, handlers: StreamHandlers = {}) => {
    const token = localStorage.getItem('token')
    const url = `${String(http.defaults.baseURL ?? '').replace(/\/$/, '')}/questions/generate/stream`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ mode_id }),
    })
    if (!response.ok) {
      throw new Error(`stream request failed: ${response.status}`)
    }
    if (!response.body) {
      throw new Error('stream response body is empty')
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let finalItems: GeneratedQuestionList | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() ?? ''
      for (const block of blocks) {
        const eventData = parseSSEBlock(block)
        if (!eventData) continue
        const payload = JSON.parse(eventData.data) as {
          text?: string
          items?: GeneratedQuestionList
          message?: string
          retry_round?: number
          raw_generated_count?: number
          filtered_count?: number
          final_count?: number
        }
        if (eventData.event === 'token' && payload.text) {
          handlers.onToken?.(payload.text)
        } else if (eventData.event === 'meta') {
          handlers.onMeta?.({
            retry_round: payload.retry_round ?? 0,
            raw_generated_count: payload.raw_generated_count ?? 0,
            filtered_count: payload.filtered_count ?? 0,
            final_count: payload.final_count ?? 0,
          })
        } else if (eventData.event === 'final') {
          finalItems = payload.items ?? []
          handlers.onFinal?.(finalItems)
        } else if (eventData.event === 'error') {
          throw new Error(payload.message ?? 'stream generation failed')
        }
      }
    }
    if (!finalItems) {
      throw new Error('stream generation ended without final result')
    }
    return finalItems
  },
  analyze: (payload: { mode_id: number; question: string; answer_text: string; answer_key: string }) =>
    getResult<AnswerIssueList>(http.post('/questions/analyze', payload)),
  explainChat: (payload: ExplainChatPayload) =>
    getResult<ExplainChatResponse>(http.post('/questions/explain/chat', payload)),
  list: (filters?: QuestionListFilters) =>
    getResult<UserQuestion[]>(
      http.get('/questions', {
        params: {
          start_date: filters?.start_date,
          end_date: filters?.end_date,
          mode_ids: filters?.mode_ids?.join(','),
          type: filters?.type,
          mode: filters?.mode,
          min_score: filters?.min_score,
          max_score: filters?.max_score,
        },
      }),
    ),
  create: (payload: QuestionPayload) =>
    getResult<UserQuestion>(http.post('/questions', payload)),
  update: (id: number, payload: QuestionPayload) =>
    getResult<UserQuestion>(http.put(`/questions/${id}`, payload)),
  remove: (id: number) => getResult<boolean>(http.delete(`/questions/${id}`)),
}
