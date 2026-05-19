import type { Theme, ThemePayload } from '../types/theme'
import { request } from '../utils/request'

export const themeService = {
  list: (filters?: { all?: boolean; parent_id?: number; level?: number }) => {
    const query = [
      filters?.all ? 'all=true' : '',
      filters?.parent_id ? `parent_id=${filters.parent_id}` : '',
      filters?.level ? `level=${filters.level}` : '',
    ]
      .filter(Boolean)
      .join('&')
    return request<Theme[]>({
      url: `/themes${query ? `?${query}` : ''}`,
    })
  },
  create: (payload: ThemePayload) =>
    request<Theme>({
      url: '/themes',
      method: 'POST',
      data: payload,
    }),
  update: (id: number, payload: ThemePayload) =>
    request<Theme>({
      url: `/themes/${id}`,
      method: 'PUT',
      data: payload,
    }),
  remove: (id: number) =>
    request<boolean>({
      url: `/themes/${id}`,
      method: 'DELETE',
    }),
}
