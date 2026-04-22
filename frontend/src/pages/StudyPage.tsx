import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { categoryLabel, defaultStudyCategory, isStudyCategory } from '../constants/study'

export const StudyPage = () => {
  const navigate = useNavigate()
  const { category } = useParams()

  const currentCategory = useMemo(
    () => (isStudyCategory(category) ? category : defaultStudyCategory),
    [category],
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Study · {categoryLabel[currentCategory]}</h1>
      <Card className="space-y-3">
        <p className="text-sm text-zinc-300">
          使用左侧二级目录选择学习对象后，可在 Modes 配置模式，在 Practice 开始练习，在 History 查看记录。
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/modes/${currentCategory}`)}>
            Go to Modes
          </Button>
          <Button onClick={() => navigate(`/practice/${currentCategory}`)}>Go to Practice</Button>
        </div>
      </Card>
    </div>
  )
}

