import type { StudyMode } from '../types/mode'
import { request } from '../utils/request'

export const modeService = {
  list: (filters?: { type?: number; mode?: number }) => {
    const query = [
      filters?.type ? `type=${filters.type}` : '',
      filters?.mode ? `mode=${filters.mode}` : '',
    ]
      .filter(Boolean)
      .join('&')
    return request<StudyMode[]>({
      url: `/modes${query ? `?${query}` : ''}`,
    })
  },
  create: (payload: {
    name: string
    description: string
    level: number
    numbers: number
    type: number
    mode: number
    theme_id?: number
    requirements: string[]
  }) =>
    request<StudyMode>({
      url: '/modes',
      method: 'POST',
      data: payload,
    }),
  update: (
    id: number,
    payload: {
      name: string
      description: string
      level: number
      numbers: number
      type: number
      mode: number
      theme_id?: number
      requirements: string[]
    },
  ) =>
    request<StudyMode>({
      url: `/modes/${id}`,
      method: 'PUT',
      data: payload,
    }),
  remove: (id: number) =>
    request<boolean>({
      url: `/modes/${id}`,
      method: 'DELETE',
    }),
}
