import type { ModeListFilters, ModePayload, StudyMode } from '../types/mode'
import { getResult, http } from './http'

export const modeApi = {
  list: (filters?: ModeListFilters) =>
    getResult<StudyMode[]>(
      http.get('/modes', {
        params: {
          type: filters?.type,
          mode: filters?.mode,
        },
      }),
    ),
  create: (payload: ModePayload) => getResult<StudyMode>(http.post('/modes', payload)),
  update: (id: number, payload: ModePayload) =>
    getResult<StudyMode>(http.put(`/modes/${id}`, payload)),
  remove: (id: number) => getResult<boolean>(http.delete(`/modes/${id}`)),
}
