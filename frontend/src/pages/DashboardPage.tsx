import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/card'
import { cn } from '../components/ui/utils'
import { useScore } from '../hooks/useScore'
import { learningPlanApi } from '../services/learningPlan'
import { questionApi } from '../services/question'
import type { LearningPlanBundle } from '../types/learningPlan'
import type { UserQuestion } from '../types/question'

type DaySummary = {
  dateKey: string
  answered: number
  averageScore: number
  items: UserQuestion[]
}

type CalendarCell = {
  key: string
  label: string
  summary: DaySummary | null
  isToday: boolean
  isSelected: boolean
  isPlanDate: boolean
  isFuture: boolean
  isBeforePlan: boolean
}

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const toDateKey = (value: Date) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toAPIDate = (value: Date) => toDateKey(value)

const shiftWeekday = (day: number) => (day === 0 ? 6 : day - 1)

const learningPlanUpdatedEvent = 'learning-plan-updated'

const buildDaySummaryMap = (items: UserQuestion[]) => {
  const map = new Map<string, DaySummary>()
  items.forEach((item) => {
    const key = toDateKey(new Date(item.create_time))
    const current = map.get(key)
    if (!current) {
      map.set(key, {
        dateKey: key,
        answered: 1,
        averageScore: item.score,
        items: [item],
      })
      return
    }
    current.items.push(item)
    current.answered += 1
    current.averageScore = Math.round(current.items.reduce((sum, question) => sum + question.score, 0) / current.items.length)
  })
  return map
}

/**
 * Dashboard with onboarding CTA, plan overview and monthly study calendar.
 */
export const DashboardPage = () => {
  const { today, fetch: fetchScore } = useScore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [learningStatus, setLearningStatus] = useState<LearningPlanBundle | null>(null)
  const [monthQuestions, setMonthQuestions] = useState<UserQuestion[]>([])
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()))

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    try {
      const [status, questions] = await Promise.all([
        learningPlanApi.current(),
        questionApi.list({
          start_date: toAPIDate(monthStart),
          end_date: toAPIDate(nextMonthStart),
        }),
        fetchScore(),
      ])
      setLearningStatus(status)
      setMonthQuestions(questions)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [fetchScore])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const refreshDashboard = () => {
      void loadDashboard()
    }
    window.addEventListener(learningPlanUpdatedEvent, refreshDashboard)
    return () => window.removeEventListener(learningPlanUpdatedEvent, refreshDashboard)
  }, [loadDashboard])

  const monthDaySummaryMap = useMemo(() => buildDaySummaryMap(monthQuestions), [monthQuestions])
  const categoryPlanItems = useMemo(
    () => learningStatus?.items ?? [],
    [learningStatus?.items],
  )
  const plannedQuestionCount = useMemo(
    () => categoryPlanItems.reduce((sum, item) => sum + item.numbers, 0),
    [categoryPlanItems],
  )
  const completionRate = plannedQuestionCount > 0 ? Math.min(100, Math.round(((today?.answered ?? 0) / plannedQuestionCount) * 100)) : 0
  const selectedDaySummary = monthDaySummaryMap.get(selectedDateKey) ?? null
  const todayKey = toDateKey(new Date())
  const planDateKey = learningStatus?.plan?.plan_date ? toDateKey(new Date(learningStatus.plan.plan_date)) : null
  const recommendedPlanItem = useMemo(
    () => categoryPlanItems.find((item) => item.mode_id),
    [categoryPlanItems],
  )
  const startLearningHref = recommendedPlanItem
    ? `/study?modeId=${recommendedPlanItem.mode_id ?? 0}`
    : null
  const canStartLearning = Boolean(startLearningHref) && completionRate < 100
  const canReview = completionRate >= 100 && plannedQuestionCount > 0

  const calendarCells = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const cells: Array<CalendarCell | null> = []

    for (let index = 0; index < shiftWeekday(firstDay.getDay()); index += 1) {
      cells.push(null)
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month, day)
      const key = toDateKey(date)
      const isFuture = key > todayKey
      const isBeforePlan = planDateKey ? key < planDateKey : false
      cells.push({
        key,
        label: `${day}`,
        summary: monthDaySummaryMap.get(key) ?? null,
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        isPlanDate: planDateKey === key,
        isFuture,
        isBeforePlan,
      })
    }

    return cells
  }, [monthDaySummaryMap, planDateKey, selectedDateKey, todayKey])

  const onboardingRequired = Boolean(
    learningStatus?.goal_required || learningStatus?.assessment_required || learningStatus?.plan_generation_required,
  )

  return (
    <div className="space-y-4">
      {loading && <Card><p className="text-sm text-zinc-400">正在加载 Dashboard...</p></Card>}
      {error && <Card><p className="text-sm text-red-400">{error}</p></Card>}

      {!loading && onboardingRequired && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold">还没有完成入学流程</p>
            <p className="text-sm text-zinc-400">先设置目标并完成水平测试，系统才会生成用户画像和学习计划。</p>
          </div>
          <Link
            to="/dashboard?onboarding=1"
            className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            入学测试
          </Link>
        </Card>
      )}

      {!loading && !onboardingRequired && learningStatus?.profile && (
        <>
          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xl font-semibold text-zinc-100">{learningStatus.plan?.title ?? '未生成'}</p>
                <p className="mt-2 text-sm text-zinc-300">{learningStatus.plan?.goal_summary ?? learningStatus.profile.goal}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>每天 {learningStatus.profile.daily_minutes} 分钟</span>
                  <span>{learningStatus.profile.study_time_range || '时间段待设置'}</span>
                  <span>今日 {today?.answered ?? 0} / {plannedQuestionCount} 题</span>
                  <span>完成率 {completionRate}%</span>
                  <span>今日分数 {today?.score ?? 0}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canStartLearning && startLearningHref && (
                  <Link
                    to={startLearningHref}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-200"
                  >
                    开始学习
                  </Link>
                )}
                {canReview ? (
                  <Link
                    to="/history"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                  >
                    开始复习
                  </Link>
                ) : (
                  <span className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 px-4 text-sm font-medium text-zinc-500">
                    开始复习
                  </span>
                )}
              </div>
            </div>
            {categoryPlanItems.length === 0 && <p className="text-sm text-zinc-500">当前暂无任务。</p>}
            <div className="grid gap-3 xl:grid-cols-3">
              {categoryPlanItems.map((item) => (
                <Card key={item.id} className="border-zinc-700 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-zinc-400">{item.description}</p>
                    <span>Lv{item.level}</span>
                    <span>{item.numbers} 题</span>
                    <span>约 {item.estimated_minutes} 分钟</span>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">本月学习日历</h2>
                <p className="text-sm text-zinc-400">点击某一天可以查看当天完成情况和分数。</p>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-zinc-500">
                {weekdayLabels.map((label) => (
                  <div key={label} className="py-1">{label}</div>
                ))}
                {calendarCells.map((cell, index) =>
                  cell ? (
                    <button
                      key={cell.key}
                      type="button"
                      className={cn(
                        'min-h-[76px] rounded-lg border p-2 text-left transition',
                        cell.summary
                          ? 'border-emerald-700 bg-emerald-950/40 hover:bg-emerald-950/60'
                          : cell.isFuture || cell.isBeforePlan
                            ? 'border-zinc-900 bg-zinc-950/40 text-zinc-600'
                            : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900',
                        cell.isSelected && 'ring-2 ring-white/60',
                        cell.isToday && 'border-sky-500',
                        cell.isPlanDate && 'border-amber-500 bg-amber-950/30',
                      )}
                      onClick={() => setSelectedDateKey(cell.key)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-100">{cell.label}</p>
                        {cell.isPlanDate && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                            计划
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-zinc-400">
                        {cell.summary
                          ? `${cell.summary.answered} 题`
                          : cell.isFuture || cell.isBeforePlan
                            ? ''
                            : '未学习'}
                      </p>
                      <p className="text-xs text-zinc-500">{cell.summary ? `分数 ${cell.summary.averageScore}` : ''}</p>
                    </button>
                  ) : (
                    <div key={`blank-${index}`} />
                  ),
                )}
              </div>
            </Card>

            <Card className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">当日详情</h2>
                <p className="text-sm text-zinc-400">{selectedDateKey}</p>
              </div>
              {selectedDaySummary ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="border-zinc-700 p-3">
                      <p className="text-xs text-zinc-500">完成题数</p>
                      <p className="text-xl font-semibold">{selectedDaySummary.answered}</p>
                    </Card>
                    <Card className="border-zinc-700 p-3">
                      <p className="text-xs text-zinc-500">平均分数</p>
                      <p className="text-xl font-semibold">{selectedDaySummary.averageScore}</p>
                    </Card>
                  </div>
                  <div className="space-y-2">
                    {selectedDaySummary.items.map((item) => (
                      <Card key={item.id} className="space-y-1 border-zinc-700 p-3">
                        <p className="text-sm font-medium text-zinc-100">{item.question}</p>
                        <p className="text-xs text-zinc-500">得分 {item.score}</p>
                        <p className="text-xs text-zinc-400">你的答案：{item.answer_text || '未填写'}</p>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500">这一天还没有学习记录。</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
