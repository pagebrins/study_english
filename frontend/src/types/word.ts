export type WordTag = {
  id: number
  word_id: number
  category_id: number
  category_name: string
  created_at?: string
  updated_at?: string
}

export type Word = {
  id: number
  word: string
  definition: string
  l1_category: string
  l2_category: string
  example: string
  tags: WordTag[]
  created_at: string
  updated_at: string
}

export type WordTagPayload = {
  id?: number
  category_id: number
  category_name: string
}

export type WordPayload = {
  word: string
  definition: string
  l1_category: string
  l2_category: string
  example: string
  tags: WordTagPayload[]
}

export type WordListFilters = {
  word?: string
  l1_category?: string
  l2_category?: string
  tag?: string
}
