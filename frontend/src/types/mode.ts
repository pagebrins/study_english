export type StudyMode = {
  id: number
  name: string
  description: string
  level: number
  numbers: number
  type: number
  mode: number
  theme_id?: number
  theme_path?: string
  requirements: string[]
}

export type ModePayload = {
  name: string
  description: string
  level: number
  numbers: number
  type: number
  mode: number
  theme_id?: number
  requirements: string[]
}

export type ModeListFilters = {
  type?: number
  mode?: number
}
