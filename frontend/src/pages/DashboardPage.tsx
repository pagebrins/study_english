import { useEffect } from 'react'
import { Card } from '../components/ui/card'
import { categoryLabel } from '../constants/study'
import { useModes } from '../hooks/useModes'
import { useQuestions } from '../hooks/useQuestions'
import { useScore } from '../hooks/useScore'
import { useStudyCategory } from '../hooks/useStudyCategory'

/**
 * Dashboard with daily overview.
 */
export const DashboardPage = () => {
  const { currentCategory, currentType } = useStudyCategory()
  const { items: modes, fetch: fetchModes } = useModes()
  const { items: questions, fetch: fetchQuestions } = useQuestions()
  const { today, fetch: fetchScore } = useScore()

  useEffect(() => {
    void fetchModes({ type: currentType })
    void fetchQuestions({ type: currentType })
    void fetchScore({ type: currentType })
  }, [currentType, fetchModes, fetchQuestions, fetchScore])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Today · {categoryLabel[currentCategory]}</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-zinc-400">Score</p><p className="text-2xl">{today?.score ?? 0}</p></Card>
        <Card><p className="text-sm text-zinc-400">Modes</p><p className="text-2xl">{modes.length}</p></Card>
        <Card><p className="text-sm text-zinc-400">Answered</p><p className="text-2xl">{questions.length}</p></Card>
      </div>
    </div>
  )
}
