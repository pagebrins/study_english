export type Theme = {
  id: number
  name: string
  parent_id?: number
  level: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type ThemePayload = {
  name: string
  parent_id?: number
  level: number
  sort_order: number
}
