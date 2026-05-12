import type { StudyMode } from '../types/mode'
import { request } from '../utils/request'

export const modeService = {
  list: (type?: number) =>
    request<StudyMode[]>({
      url: `/modes${type ? `?type=${type}` : ''}`,
    }),
}
