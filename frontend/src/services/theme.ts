import type { Theme, ThemeListFilters, ThemePayload } from '../types/theme'
import { getResult, http } from './http'

export const themeApi = {
  list: (filters?: ThemeListFilters) =>
    getResult<Theme[]>(
      http.get('/themes', {
        params: {
          all: filters?.all,
          parent_id: filters?.parent_id,
          level: filters?.level,
        },
      }),
    ),
  create: (payload: ThemePayload) => getResult<Theme>(http.post('/themes', payload)),
  update: (id: number, payload: ThemePayload) => getResult<Theme>(http.put(`/themes/${id}`, payload)),
  remove: (id: number) => getResult<boolean>(http.delete(`/themes/${id}`)),
}
