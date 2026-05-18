import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PronunciationButton } from '../components/PronunciationButton'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { cn } from '../components/ui/utils'
import { categoryLabel, translationModeLabel } from '../constants/study'
import { learningPlanApi } from '../services/learningPlan'
import { questionApi } from '../services/question'
import type { LearningPlanBundle, LearningPlanItem } from '../types/learningPlan'
import type { GeneratedQuestionList } from '../types/question'

const studyPageUpdatedEvent = 'learning-plan-updated'
const studyQuestionCacheKey = 'study-question-cache'

const readQuestionCache = (): Record<number, GeneratedQuestionList> => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(studyQuestionCacheKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, GeneratedQuestionList>
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [Number(key), Array.isArray(value) ? value : []]),
    )
  } catch {
    return {}
  }
}

const writeQuestionCache = (cache: Record<number, GeneratedQuestionList>) => {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(studyQuestionCacheKey, JSON.stringify(cache))
  } catch {
    // Ignore cache persistence failures and keep runtime state only.
  }
}

export const StudyPage = () => {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [learningStatus, setLearningStatus] = useState<LearningPlanBundle | null>(null)
  const [selectedModeId, setSelectedModeId] = useState(() => Number(searchParams.get('modeId') ?? 0))
  const [generatedByMode, setGeneratedByMode] = useState<Record<number, GeneratedQuestionList>>(() => readQuestionCache())
  const [generatingModeId, setGeneratingModeId] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [issues, setIssues] = useState<Record<number, string[]>>({})
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({})

  const loadStudyPlan = async () => {
    setLoading(true)
    setPageError('')
    try {
      const current = await learningPlanApi.current()
      setLearningStatus(current)
    } catch (err) {
      setPageError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStudyPlan()
  }, [])

  useEffect(() => {
    const refreshStudyPlan = () => {
      void loadStudyPlan()
    }
    window.addEventListener(studyPageUpdatedEvent, refreshStudyPlan)
    return () => window.removeEventListener(studyPageUpdatedEvent, refreshStudyPlan)
  }, [])

  const planItems = useMemo(
    () => (learningStatus?.items ?? []).filter((item) => item.mode_id),
    [learningStatus?.items],
  )

  useEffect(() => {
    if (planItems.length === 0) return
    const requestedModeId = Number(searchParams.get('modeId') ?? 0)
    const availableModeIDs = planItems.map((item) => item.mode_id ?? 0)
    if (selectedModeId > 0 && availableModeIDs.includes(selectedModeId)) {
      return
    }
    if (requestedModeId > 0 && availableModeIDs.includes(requestedModeId)) {
      setSelectedModeId(requestedModeId)
      return
    }
    if (!availableModeIDs.includes(selectedModeId)) {
      setSelectedModeId(availableModeIDs[0])
    }
  }, [planItems, searchParams, selectedModeId])

  const selectedPlanItem = useMemo(
    () => planItems.find((item) => item.mode_id === selectedModeId),
    [planItems, selectedModeId],
  )
  const generated = selectedModeId > 0 ? (generatedByMode[selectedModeId] ?? []) : []
  const generating = generatingModeId === selectedModeId

  const ensureGeneratedQuestions = async (modeId: number) => {
    if (!modeId || generatedByMode[modeId]?.length) return
    setGeneratingModeId(modeId)
    setPageError('')
    try {
      const items = await questionApi.generate(modeId)
      setGeneratedByMode((prev) => {
        const next = { ...prev, [modeId]: items }
        writeQuestionCache(next)
        return next
      })
    } catch (err) {
      setPageError((err as Error).message)
    } finally {
      setGeneratingModeId((prev) => (prev === modeId ? 0 : prev))
    }
  }

  useEffect(() => {
    if (!selectedPlanItem?.mode_id) return
    setAnswers({})
    setIssues({})
    void ensureGeneratedQuestions(selectedPlanItem.mode_id)
  }, [selectedPlanItem?.mode_id])

  const switchPlan = (item: LearningPlanItem) => {
    if (!item.mode_id || item.mode_id === selectedModeId) return
    setSelectedModeId(item.mode_id)
    setAnswers({})
    setIssues({})
  }

  const submit = async (index: number) => {
    const current = generated[index]
    if (!current || !selectedPlanItem?.mode_id) return
    if (submitting[index]) return
    const answer = answers[index] ?? ''
    setSubmitting((prev) => ({ ...prev, [index]: true }))
    setPageError('')
    try {
      const analysis = await questionApi.analyze({
        mode_id: selectedPlanItem.mode_id,
        question: current.question,
        answer_text: answer,
        answer_key: current.answer_key,
      })
      setIssues((prev) => ({ ...prev, [index]: analysis }))
      await questionApi.create({
        mode_id: selectedPlanItem.mode_id,
        question: current.question,
        answer_key: current.answer_key,
        answer_text: answer,
        score: analysis.length === 0 ? 100 : Math.max(60, 100 - analysis.length * 10),
        pre_generated_id: current.pre_generated_id,
      })
    } catch (err) {
      setPageError((err as Error).message)
    } finally {
      setSubmitting((prev) => ({ ...prev, [index]: false }))
    }
  }

  const onboardingRequired = Boolean(
    learningStatus?.goal_required || learningStatus?.assessment_required || learningStatus?.plan_generation_required,
  )

  return (
    <div className="space-y-4">
      {loading && <Card><p className="text-sm text-zinc-400">正在加载学习计划...</p></Card>}
      {!loading && pageError && <Card><p className="text-sm text-red-400">{pageError}</p></Card>}

      {!loading && onboardingRequired && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold">还没有完成入学流程</p>
            <p className="text-sm text-zinc-400">先完成目标设置、水平测试和学习计划生成，才能开始正式学习。</p>
          </div>
          <Link
            to="/dashboard?onboarding=1"
            className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            去完成入学流程
          </Link>
        </Card>
      )}

      {!loading && !onboardingRequired && learningStatus?.profile && (
        <>
          <Card className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-3">
              {planItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'rounded-xl border p-4 text-left transition',
                    item.mode_id === selectedModeId
                      ? 'border-white bg-zinc-900'
                      : 'border-zinc-700 bg-zinc-950 hover:bg-zinc-900',
                  )}
                  onClick={() => switchPlan(item)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-zinc-400">{item.description}</p>
                    <span className="text-sm text-zinc-300">{categoryLabel[item.study_type === 1 ? 'word' : item.study_type === 2 ? 'sentence' : 'article']}</span>
                    <span className="text-sm text-zinc-300">{translationModeLabel[item.translation_mode] ?? '-'}</span>
                    <span className="text-sm text-zinc-300">Lv{item.level}</span>
                    <span className="text-sm text-zinc-300">{item.numbers} 题</span>
                    <span className="text-sm text-zinc-300">约 {item.estimated_minutes} 分钟</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{selectedPlanItem?.name ?? '题目练习'}</h2>
              {selectedPlanItem && (
                <p className="text-sm text-zinc-400">
                  {selectedPlanItem.description} · {translationModeLabel[selectedPlanItem.translation_mode] ?? '-'}
                </p>
              )}
            </div>

            {selectedPlanItem?.mode_id && generating && (
              <Card className="flex h-52 items-center justify-center border-zinc-700">
                <div className="inline-flex items-center gap-3 text-sm text-zinc-300">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                  正在生成题目，请稍候...
                </div>
              </Card>
            )}

            {selectedPlanItem?.mode_id && generated.length > 0 && (
              <div className="space-y-3">
                {generated.map((item, index) => (
                  <Card key={`${item.question}-${index}`} className="space-y-2 border-zinc-700">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-zinc-300">{index + 1}. {item.question}</p>
                      <PronunciationButton pronunciation={item.question_pronunciation} label="Play prompt" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          className={submitting[index] ? 'pr-9' : ''}
                          placeholder="Your answer"
                          value={answers[index] ?? ''}
                          onChange={(event) => setAnswers((prev) => ({ ...prev, [index]: event.target.value }))}
                        />
                        {submitting[index] && (
                          <span
                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent"
                            aria-label="Submitting answer"
                          />
                        )}
                      </div>
                      <Button variant="outline" onClick={() => void submit(index)} disabled={!!submitting[index]}>
                        {submitting[index] ? '提交中...' : '提交答案'}
                      </Button>
                    </div>
                    {issues[index]?.length ? (
                      <div className="space-y-2">
                        <ul className="list-disc space-y-1 pl-5 text-xs text-red-400">
                          {issues[index].map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-300">
                          <p>标准答案：{item.answer_key}</p>
                          <PronunciationButton pronunciation={item.answer_key_pronunciation} label="Play answer" />
                        </div>
                      </div>
                    ) : (
                      issues[index] && <p className="text-xs text-emerald-300">👍 回答正确</p>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {!generating && selectedPlanItem?.mode_id && generated.length === 0 && (
              <p className="text-sm text-zinc-500">正在为当前计划准备题目。</p>
            )}

            {!selectedPlanItem && <p className="text-sm text-zinc-500">当前没有可用的学习计划。</p>}
          </Card>
        </>
      )}
    </div>
  )
}
