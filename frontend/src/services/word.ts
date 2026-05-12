import type { Word, WordListFilters, WordPayload } from '../types/word'
import { getResult, http } from './http'

export const wordApi = {
  list: (filters?: WordListFilters) =>
    getResult<Word[]>(
      http.get('/words', {
        params: {
          word: filters?.word,
          l1_category: filters?.l1_category,
          l2_category: filters?.l2_category,
          tag: filters?.tag,
        },
      }),
    ),
  export: async (filters?: WordListFilters) => {
    const response = await http.get('/words/export', {
      params: {
        word: filters?.word,
        l1_category: filters?.l1_category,
        l2_category: filters?.l2_category,
        tag: filters?.tag,
      },
      responseType: 'blob',
    })
    return response.data as Blob
  },
  create: (payload: WordPayload) => getResult<Word>(http.post('/words', payload)),
  update: (id: number, payload: WordPayload) => getResult<Word>(http.put(`/words/${id}`, payload)),
  remove: (id: number) => getResult<boolean>(http.delete(`/words/${id}`)),
}
