import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PronunciationButton } from '../components/PronunciationButton'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { categoryLabel, translationModeLabel } from '../constants/study'
import { useStudyCategory } from '../hooks/useStudyCategory'
import { learningPlanApi } from '../services/learningPlan'
import type { LearningPlanBundle } from '../types/learningPlan'

const assessmentTypeLabel: Record<string, string> = {
  initial: '初始水平测试',
  upgrade: '提高难度测试',
  downgrade: '降低难度测试',
}

export const ModesPage = () => {
  const navigate = useNavigate()
  const { currentCategory, currentType } = useStudyCategory()
  const [bundle, setBundle] = useState<LearningPlanBundle>({
    assessment_items: [],
    items: [],
    goal_required: false,
    assessment_required: false,
    plan_generation_required: false,
  })
  const [goal, setGoal] = useState('')
  const [dailyMinutes, setDailyMinutes] = useState(20)
  const [studyTimeRange, setStudyTimeRange] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingGoal, setSavingGoal] = useState(false)
  const [submittingAssessment, setSubmittingAssessment] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<Record<number, string>>({})

  const loadStatus = async () => {
    setLoading(true)
    try {
      const current = await learningPlanApi.current()
      setBundle(current)
      setGoal(current.profile?.goal ?? '')
      setDailyMinutes(current.profile?.daily_minutes ?? 20)
      setStudyTimeRange(current.profile?.study_time_range ?? '')
      setAnswers(
        Object.fromEntries(current.assessment_items.map((item) => [item.id, item.user_answer ?? ''])),
      )
      setError('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  const categoryItems = useMemo(
    () => bundle.items.filter((item) => item.study_type === currentType),
    [bundle.items, currentType],
  )

  const submitGoal = async () => {
    setSavingGoal(true)
    try {
      const next = await learningPlanApi.setGoal({
        goal,
        daily_minutes: Math.max(1, dailyMinutes),
        study_time_range: studyTimeRange,
      })
      setBundle(next)
      setGoal(next.profile?.goal ?? goal)
      setDailyMinutes(next.profile?.daily_minutes ?? dailyMinutes)
      setStudyTimeRange(next.profile?.study_time_range ?? studyTimeRange)
      setAnswers(
        Object.fromEntries(next.assessment_items.map((item) => [item.id, item.user_answer ?? ''])),
      )
      setError('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSavingGoal(false)
    }
  }

  const submitAssessment = async () => {
    if (!bundle.assessment) return
    setSubmittingAssessment(true)
    try {
      const next = await learningPlanApi.submitAssessment({
        assessment_id: bundle.assessment.id,
        answers: bundle.assessment_items.map((item) => ({
          item_id: item.id,
          user_answer: answers[item.id] ?? '',
        })),
      })
      setBundle(next)
      setAnswers({})
      setError('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmittingAssessment(false)
    }
  }

  const generatePlan = async () => {
    setGeneratingPlan(true)
    try {
      const next = await learningPlanApi.generate()
      setBundle(next)
      setError('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGeneratingPlan(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Learning Plan · {categoryLabel[currentCategory]}</h1>
        <p className="text-sm text-zinc-400">系统会先根据唯一学习目标做单词和句子测评，再生成训练计划，并按次日测试自动调难度。</p>
      </div>

      {loading && <Card><p className="text-sm text-zinc-400">正在加载学习状态...</p></Card>}
      {error && <Card><p className="text-sm text-red-400">{error}</p></Card>}

      {!loading && bundle.goal_required && (
        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">设置唯一学习目标</h2>
            <p className="text-sm text-zinc-400">每个用户只保留一个目标。设置后会立即进入初始单词/句子测评。</p>
          </div>
          <Input
            value={goal}
            placeholder="例如：三个月内提升职场英语表达"
            onChange={(event) => setGoal(event.target.value)}
          />
          <Input
            type="number"
            min="1"
            value={dailyMinutes}
            placeholder="每天学习多少分钟"
            onChange={(event) => setDailyMinutes(Number(event.target.value) || 0)}
          />
          <Input
            value={studyTimeRange}
            placeholder="例如：工作日 20:00-21:00"
            onChange={(event) => setStudyTimeRange(event.target.value)}
          />
          <Button onClick={() => void submitGoal()} disabled={savingGoal}>
            {savingGoal ? '保存中...' : '保存目标并开始测评'}
          </Button>
        </Card>
      )}

      {!loading && !bundle.goal_required && bundle.assessment_required && bundle.assessment && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{assessmentTypeLabel[bundle.assessment.assessment_type] ?? '能力测试'}</h2>
            <p className="text-sm text-zinc-400">
              当前目标：{bundle.profile?.goal}。请完成下面的单词和句子测试，系统会据此生成或调整训练难度。
            </p>
          </div>
          <div className="space-y-3">
            {bundle.assessment_items.map((item, index) => (
              <Card key={item.id} className="space-y-2 border-zinc-700">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-zinc-300">
                    {index + 1}. {item.question}
                  </p>
                  <PronunciationButton pronunciation={item.question_pronunciation} label="Play prompt" />
                </div>
                <Input
                  value={answers[item.id] ?? ''}
                  placeholder="请输入你的答案"
                  onChange={(event) => setAnswers((prev) => ({ ...prev, [item.id]: event.target.value }))}
                />
              </Card>
            ))}
          </div>
          <Button onClick={() => void submitAssessment()} disabled={submittingAssessment}>
            {submittingAssessment ? '提交测试中...' : '提交测试'}
          </Button>
        </Card>
      )}

      {!loading && !bundle.goal_required && !bundle.assessment_required && bundle.plan_generation_required && bundle.profile && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">用户画像</h2>
            <p className="text-sm text-zinc-400">水平测试已完成。请先确认系统生成的用户画像，再手动生成学习计划。</p>
          </div>
          <div className="space-y-2 text-sm text-zinc-300">
            <p>学习目标：{bundle.profile.goal}</p>
            <p>每日学习时长：{bundle.profile.daily_minutes} 分钟</p>
            <p>学习时间段：{bundle.profile.study_time_range || '待设置'}</p>
            <p>单词 Level：{bundle.profile.word_level}</p>
            <p>句子 Level：{bundle.profile.sentence_level}</p>
            <p>综合 Level：{bundle.profile.overall_level}</p>
            <p>训练方向：{translationModeLabel[bundle.profile.translation_mode] ?? '中译英'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void submitGoal()} disabled={savingGoal}>
              更新目标并重新测评
            </Button>
            <Button onClick={() => void generatePlan()} disabled={generatingPlan}>
              {generatingPlan ? '生成中...' : '生成学习计划'}
            </Button>
          </div>
        </Card>
      )}

      {!loading && !bundle.goal_required && !bundle.assessment_required && !bundle.plan_generation_required && bundle.profile && (
        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">当前学习画像</h2>
            <p className="text-sm text-zinc-400">{bundle.plan?.goal_summary ?? `目标：${bundle.profile.goal}`}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
            <span>每天 {bundle.profile.daily_minutes} 分钟</span>
            <span>{bundle.profile.study_time_range || '时间段待设置'}</span>
            <span>单词 Level {bundle.profile.word_level}</span>
            <span>句子 Level {bundle.profile.sentence_level}</span>
            <span>综合 Level {bundle.profile.overall_level}</span>
            <span>{translationModeLabel[bundle.profile.translation_mode] ?? '中译英'}</span>
          </div>
          <div className="flex gap-2">
            <Input value={goal} onChange={(event) => setGoal(event.target.value)} />
            <Input
              type="number"
              min="1"
              value={dailyMinutes}
              onChange={(event) => setDailyMinutes(Number(event.target.value) || 0)}
            />
            <Input value={studyTimeRange} onChange={(event) => setStudyTimeRange(event.target.value)} />
            <Button variant="outline" onClick={() => void submitGoal()} disabled={savingGoal}>
              更新目标并重新测评
            </Button>
          </div>
        </Card>
      )}

      {!loading && !bundle.goal_required && !bundle.assessment_required && !bundle.plan_generation_required && (
        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">今日任务</h2>
            <p className="text-sm text-zinc-400">如果今天练习里有 90% 题目满分，系统会在明天先安排提高难度测试；如果 90% 都不是满分，则安排降低难度测试。</p>
          </div>
          {categoryItems.length === 0 && (
            <p className="text-sm text-zinc-400">当前分类下暂无任务，请切换左侧分类查看。</p>
          )}
          {categoryItems.map((item) => (
            <Card key={item.id} className="border-zinc-700">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-zinc-400">{item.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span>{translationModeLabel[item.translation_mode] ?? '-'}</span>
                    <span>Lv{item.level}</span>
                    <span>{item.numbers} 题</span>
                    <span>约 {item.estimated_minutes} 分钟</span>
                  </div>
                  {item.requirements.length > 0 && (
                    <div className="space-y-1 text-xs text-zinc-300">
                      {item.requirements.map((requirement) => (
                        <p key={requirement}>{requirement}</p>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={() => navigate(`/practice/${currentCategory}?modeId=${item.mode_id ?? 0}`)} disabled={!item.mode_id}>
                  开始这个任务
                </Button>
              </div>
            </Card>
          ))}
        </Card>
      )}
    </div>
  )
}
