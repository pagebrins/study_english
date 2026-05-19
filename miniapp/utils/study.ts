export const studyTypeLabel = (type: number) => {
  if (type === 1) return '单词'
  if (type === 2) return '句子'
  if (type === 3) return '文章'
  return `类型 ${type}`
}

export const translationModeLabel = (mode: number) => {
  if (mode === 1) return '中译英'
  if (mode === 2) return '英译中'
  return `模式 ${mode}`
}
