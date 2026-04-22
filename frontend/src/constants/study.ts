export const studyCategories = ['word', 'sentence', 'article'] as const

export type StudyCategory = (typeof studyCategories)[number]

export const categoryLabel: Record<StudyCategory, string> = {
  word: '单词',
  sentence: '句子',
  article: '文章',
}

export const categoryType: Record<StudyCategory, number> = {
  word: 1,
  sentence: 2,
  article: 3,
}

export const translationModeLabel: Record<number, string> = {
  1: '中译英',
  2: '英译中',
}

export const isStudyCategory = (value: string | undefined): value is StudyCategory =>
  Boolean(value && studyCategories.includes(value as StudyCategory))

export const defaultStudyCategory: StudyCategory = 'sentence'

