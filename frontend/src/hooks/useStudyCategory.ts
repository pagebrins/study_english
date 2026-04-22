import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { categoryType, defaultStudyCategory, isStudyCategory } from '../constants/study'

export const useStudyCategory = () => {
  const { category } = useParams()
  const currentCategory = useMemo(
    () => (isStudyCategory(category) ? category : defaultStudyCategory),
    [category],
  )

  return {
    currentCategory,
    currentType: categoryType[currentCategory],
  }
}

