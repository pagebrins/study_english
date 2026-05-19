import type { Word, WordPayload } from '../types/word'
import { request } from '../utils/request'

export const wordService = {
  list: (filters?: { word?: string; l1_category?: string; l2_category?: string; tag?: string }) => {
    const query = [
      filters?.word ? `word=${encodeURIComponent(filters.word)}` : '',
      filters?.l1_category ? `l1_category=${encodeURIComponent(filters.l1_category)}` : '',
      filters?.l2_category ? `l2_category=${encodeURIComponent(filters.l2_category)}` : '',
      filters?.tag ? `tag=${encodeURIComponent(filters.tag)}` : '',
    ]
      .filter(Boolean)
      .join('&')
    return request<Word[]>({
      url: `/words${query ? `?${query}` : ''}`,
    })
  },
  create: (payload: WordPayload) =>
    request<Word>({
      url: '/words',
      method: 'POST',
      data: payload,
    }),
  update: (id: number, payload: WordPayload) =>
    request<Word>({
      url: `/words/${id}`,
      method: 'PUT',
      data: payload,
    }),
  remove: (id: number) =>
    request<boolean>({
      url: `/words/${id}`,
      method: 'DELETE',
    }),
}
