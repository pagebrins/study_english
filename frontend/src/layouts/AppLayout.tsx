import { ChevronDown, MessageCircle, Settings, User, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { HelpChatPanel } from '../components/chat/HelpChatPanel'
import { PronunciationButton } from '../components/PronunciationButton'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useAuth } from '../hooks/useAuth'
import { learningPlanApi } from '../services/learningPlan'
import { useHelpChatStore } from '../store/helpChatStore'
import type { LearningPlanBundle } from '../types/learningPlan'
import { isAdminUser } from '../utils/auth'
import { hasPermission } from '../utils/permission'

const navSections = [
  { key: 'dashboard', label: 'Dashboard', base: '/dashboard' },
  { key: 'study', label: 'Study', base: '/study' },
  { key: 'practice', label: 'Practice', base: '/practice' },
  { key: 'history', label: 'History', base: '/history' },
  { key: 'mode-settings', label: 'Mode Settings', base: '/mode-settings' },
]

const learningPlanUpdatedEvent = 'learning-plan-updated'

/**
 * Main shell with 4-zone layout.
 */
export const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, shouldPromptOnboarding, markOnboardingPromptHandled } = useAuth()
  const { isOpen, isMinimized, open, close, restore, ensureOpenHint, setContext } = useHelpChatStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSettingMenuOpen, setIsSettingMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [learningStatus, setLearningStatus] = useState<LearningPlanBundle | null>(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [learningError, setLearningError] = useState('')
  const [goalDraft, setGoalDraft] = useState('')
  const [dailyMinutesDraft, setDailyMinutesDraft] = useState(20)
  const [studyTimeRangeDraft, setStudyTimeRangeDraft] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)
  const [submittingAssessment, setSubmittingAssessment] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<number, string>>({})
  const avatarText = useMemo(() => {
    const source = user?.name?.trim() || user?.email?.trim() || 'U'
    return source.charAt(0).toUpperCase()
  }, [user?.email, user?.name])
  const canUsePractice = hasPermission(user, 'practice.use')
  const canUseChat = hasPermission(user, 'chat.use')
  const isAdmin = isAdminUser(user)
  const canViewStudy = hasPermission(user, 'study.view')
  const canManageTheme = hasPermission(user, 'settings.theme.manage')
  const canManageKnowledge = hasPermission(user, 'settings.knowledge.manage')
  const canManagePermission = hasPermission(user, 'settings.permission.manage')
  const visibleSections = useMemo(() => {
    if (!isAdmin) {
      return navSections.filter((section) => section.key === 'dashboard' || section.key === 'study' || section.key === 'history')
    }
    return navSections.filter((section) => {
      if (section.key === 'study') return canViewStudy
      if (section.key === 'practice') return canUsePractice
      return true
    })
  }, [canUsePractice, canViewStudy, isAdmin])
  const wordAssessmentItems = useMemo(
    () => learningStatus?.assessment_items.filter((item) => item.study_type === 1) ?? [],
    [learningStatus?.assessment_items],
  )
  const sentenceAssessmentItems = useMemo(
    () => learningStatus?.assessment_items.filter((item) => item.study_type === 2) ?? [],
    [learningStatus?.assessment_items],
  )

  useEffect(() => {
    const onPracticePage = location.pathname.startsWith('/practice/')
    const onStudyPage = location.pathname === '/study'
    const onHistoryPage = location.pathname === '/history'
    if (!onPracticePage && !onStudyPage && !onHistoryPage) {
      setContext({ page: 'other' })
    }
  }, [location.pathname, setContext])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('onboarding') !== '1' || !learningStatus) return
    openOnboarding()
  }, [learningStatus, location.search])

  const refreshLearningStatus = async () => {
    if (!user) return
    try {
      const current = await learningPlanApi.current()
      setLearningStatus(current)
      setGoalDraft(current.profile?.goal ?? '')
      setDailyMinutesDraft(current.profile?.daily_minutes ?? 20)
      setStudyTimeRangeDraft(current.profile?.study_time_range ?? '')
      setAssessmentAnswers(
        Object.fromEntries(current.assessment_items.map((item) => [item.id, item.user_answer ?? ''])),
      )
      setLearningError('')
      if (current.goal_required) {
        setOnboardingStep(1)
      } else if (current.assessment_required) {
        setOnboardingStep(2)
      } else if (current.plan_generation_required) {
        setOnboardingStep(4)
      } else {
        setOnboardingStep(5)
      }
      if (shouldPromptOnboarding && (current.goal_required || current.assessment_required || current.plan_generation_required)) {
        setOnboardingOpen(true)
      } else if (!current.goal_required && !current.assessment_required && !current.plan_generation_required) {
        if (onboardingOpen) {
          setOnboardingStep(5)
        } else {
          setOnboardingOpen(false)
        }
      }
    } catch (error) {
      setLearningError((error as Error).message)
    }
  }

  useEffect(() => {
    if (!user) return
    void refreshLearningStatus()
  }, [shouldPromptOnboarding, user?.id])

  const openOnboarding = () => {
    if (!learningStatus) return
    if (learningStatus.goal_required) {
      setOnboardingStep(1)
    } else if (learningStatus.assessment_required) {
      setOnboardingStep(2)
    } else if (learningStatus.plan_generation_required) {
      setOnboardingStep(4)
    } else {
      setOnboardingStep(5)
    }
    setOnboardingOpen(true)
  }

  const saveGoal = async () => {
    setSavingGoal(true)
    try {
      await learningPlanApi.setGoal({
        goal: goalDraft,
        daily_minutes: Math.max(1, dailyMinutesDraft),
        study_time_range: studyTimeRangeDraft,
      })
      await refreshLearningStatus()
      setOnboardingStep(2)
    } catch (error) {
      setLearningError((error as Error).message)
    } finally {
      setSavingGoal(false)
    }
  }

  const submitAssessment = async () => {
    if (!learningStatus?.assessment) return
    setSubmittingAssessment(true)
    try {
      await learningPlanApi.submitAssessment({
        assessment_id: learningStatus.assessment.id,
        answers: learningStatus.assessment_items.map((item) => ({
          item_id: item.id,
          user_answer: assessmentAnswers[item.id] ?? '',
        })),
      })
      await refreshLearningStatus()
    } catch (error) {
      setLearningError((error as Error).message)
    } finally {
      setSubmittingAssessment(false)
    }
  }

  const generatePlan = async () => {
    setGeneratingPlan(true)
    try {
      await learningPlanApi.generate()
      await refreshLearningStatus()
      window.dispatchEvent(new Event(learningPlanUpdatedEvent))
    } catch (error) {
      setLearningError((error as Error).message)
    } finally {
      setGeneratingPlan(false)
    }
  }

  const confirmOnboardingPlan = () => {
    setOnboardingOpen(false)
    markOnboardingPromptHandled()
  }

  const goNextAssessmentStep = () => {
    const currentItems = onboardingStep === 2 ? wordAssessmentItems : sentenceAssessmentItems
    const hasMissingAnswer = currentItems.some((item) => !(assessmentAnswers[item.id] ?? '').trim())
    if (hasMissingAnswer) {
      setLearningError('请先完成当前步骤的所有答案。')
      return
    }
    setLearningError('')
    if (onboardingStep === 2) {
      setOnboardingStep(3)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] grid-rows-[72px_1fr] bg-background">
      <div className="flex items-center border-b border-r border-zinc-800 bg-zinc-950 px-4">
        <Link to="/" className="block text-sm font-semibold tracking-wide">
          AI English Study
        </Link>
      </div>

      <aside className="row-start-2 border-r border-zinc-800 bg-zinc-950 px-4 py-4">
        <nav className="space-y-2">
          {visibleSections.map((section) => {
            const sectionActive = location.pathname === section.base || location.pathname.startsWith(`${section.base}/`)
            return (
              <div key={section.key} className="space-y-1">
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm ${
                    sectionActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900'
                  }`}
                  onClick={() => {
                    navigate(section.base)
                  }}
                >
                  {section.label}
                </button>
              </div>
            )
          })}
        </nav>
      </aside>

      <header className="col-start-2 flex items-center justify-end border-b border-zinc-800 bg-zinc-950 px-6">
        {(canManageTheme || canManageKnowledge || canManagePermission) && (
          <div
            className="relative mr-2"
            onMouseEnter={() => setIsSettingMenuOpen(true)}
            onMouseLeave={() => setIsSettingMenuOpen(false)}
          >
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
              title="Setting"
              onClick={() => setIsSettingMenuOpen((value) => !value)}
            >
              <Settings size={18} />
            </button>
            {isSettingMenuOpen && (
              <div className="absolute right-0 top-full z-40 min-w-[120px] rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-lg">
                {canManageTheme && (
                  <button
                    type="button"
                    className="w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                    onClick={() => {
                      window.open('/settings?tab=theme', '_blank', 'noopener,noreferrer')
                      setIsSettingMenuOpen(false)
                    }}
                  >
                    主题
                  </button>
                )}
                {canManageKnowledge && (
                  <button
                    type="button"
                    className="w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                    onClick={() => {
                      window.open('/settings?tab=knowledge', '_blank', 'noopener,noreferrer')
                      setIsSettingMenuOpen(false)
                    }}
                  >
                    知识库
                  </button>
                )}
                {canManagePermission && (
                  <button
                    type="button"
                    className="w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                    onClick={() => {
                      window.open('/settings?tab=permission', '_blank', 'noopener,noreferrer')
                      setIsSettingMenuOpen(false)
                    }}
                  >
                    权限
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {canUseChat && (
          <div className="mr-2">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
              onClick={() => {
                if (isOpen && isMinimized) {
                  restore()
                } else if (!isOpen) {
                  open()
                  ensureOpenHint()
                }
              }}
              title="Open chat"
            >
              <MessageCircle size={18} />
            </button>
          </div>
        )}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {user?.image ? (
              <img src={user.image} alt="User avatar" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold">
                {avatarText}
              </span>
            )}
            <ChevronDown size={16} className="text-zinc-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-lg">
              <button
                type="button"
                className="w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={() => {
                  setProfileOpen(true)
                  setMenuOpen(false)
                }}
              >
                Profile
              </button>
              <button
                type="button"
                className="w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="col-start-2 row-start-2 min-h-0 p-6">
        <div className="flex h-full min-h-0 gap-4">
          <section className={`min-w-0 transition-all duration-200 ${isOpen && !isMinimized ? 'w-[calc(100%-420px)]' : 'w-full'}`}>
            <Outlet />
          </section>
          {canUseChat && isOpen && (
            <aside className={`shrink-0 min-h-0 transition-all duration-200 ${isMinimized ? 'w-14' : 'w-[420px]'}`}>
              {isMinimized ? (
                <div className="group relative flex h-full items-start justify-center rounded-md border border-zinc-800 bg-zinc-950 py-4">
                  <button
                    type="button"
                    className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded border border-red-500/60 bg-red-500/20 text-red-400 hover:bg-red-500/30 group-hover:flex"
                    onClick={close}
                    title="Close chat"
                  >
                    <X size={10} />
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                    onClick={restore}
                    title="Restore chat"
                  >
                    <MessageCircle size={16} />
                  </button>
                </div>
              ) : (
                <div className="h-full min-h-0 overflow-hidden rounded-md border border-zinc-800">
                  <HelpChatPanel />
                </div>
              )}
            </aside>
          )}
        </div>
      </main>
      {profileOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
          <Card className="w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={18} />
                <h2 className="text-lg font-semibold">Profile</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setProfileOpen(false)}>Close</Button>
            </div>
            <div className="space-y-2 text-sm text-zinc-300">
              <p>Name: {user?.name ?? '-'}</p>
              <p>Email: {user?.email ?? '-'}</p>
              <p>Phone: {user?.phone || '-'}</p>
              <p>Role: {user?.role_name || user?.role_code || '-'}</p>
            </div>
            <div className="space-y-2 border-t border-zinc-800 pt-4 text-sm text-zinc-300">
              <p className="font-medium text-zinc-100">Learning Profile</p>
              <p>Goal: {learningStatus?.profile?.goal || 'Not set'}</p>
              <p>Word Level: {learningStatus?.profile?.word_level ?? '-'}</p>
              <p>Sentence Level: {learningStatus?.profile?.sentence_level ?? '-'}</p>
              <p>Overall Level: {learningStatus?.profile?.overall_level ?? '-'}</p>
              <p>Next Assessment: {learningStatus?.profile?.next_assessment_type || 'None'}</p>
            </div>
            <div className="border-t border-zinc-800 pt-4">
              <div className="flex gap-2">
                {(learningStatus?.goal_required || learningStatus?.assessment_required || learningStatus?.plan_generation_required) && (
                  <Button onClick={openOnboarding}>Continue Onboarding</Button>
                )}
                <Button variant="outline" onClick={() => {
                  setProfileOpen(false)
                  setOnboardingStep(1)
                  setOnboardingOpen(true)
                }}>
                  更新目标并测试
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      {onboardingOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-4">
          <Card className="w-full max-w-3xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Learning Onboarding</h2>
                <p className="text-xs text-zinc-500">Step {onboardingStep} / 5</p>
              </div>
              {onboardingStep !== 5 && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setOnboardingOpen(false)
                  markOnboardingPromptHandled()
                }}>
                  稍后再说
                </Button>
              )}
            </div>
            {learningError && <p className="text-sm text-red-400">{learningError}</p>}
            {onboardingStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">第一步先设置学习目标。保存后会进入单词测试。</p>
                <Input value={goalDraft} placeholder="例如：提升职场英语表达" onChange={(event) => setGoalDraft(event.target.value)} />
                <Input
                  type="number"
                  min="1"
                  value={dailyMinutesDraft}
                  placeholder="每天可学习多少分钟"
                  onChange={(event) => setDailyMinutesDraft(Number(event.target.value) || 0)}
                />
                <Input
                  value={studyTimeRangeDraft}
                  placeholder="例如：工作日 20:00-21:00"
                  onChange={(event) => setStudyTimeRangeDraft(event.target.value)}
                />
                <Button onClick={() => void saveGoal()} disabled={savingGoal}>
                  {savingGoal ? 'Saving...' : '保存目标并下一步'}
                </Button>
              </div>
            )}
            {onboardingStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  第二步：完成单词测试。当前目标：{learningStatus?.profile?.goal}
                </p>
                <div className="space-y-3">
                  {wordAssessmentItems.map((item, index) => (
                    <Card key={item.id} className="space-y-2 border-zinc-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-zinc-300">{index + 1}. {item.question}</p>
                        <PronunciationButton pronunciation={item.question_pronunciation} label="Play prompt" />
                      </div>
                      <Input
                        value={assessmentAnswers[item.id] ?? ''}
                        placeholder="请输入你的答案"
                        onChange={(event) => setAssessmentAnswers((prev) => ({ ...prev, [item.id]: event.target.value }))}
                        />
                    </Card>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOnboardingStep(1)}>
                    上一步
                  </Button>
                  <Button onClick={goNextAssessmentStep}>
                    下一步：句子测试
                  </Button>
                </div>
              </div>
            )}
            {onboardingStep === 3 && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  第三步：完成句子测试。提交后系统会生成或更新你的训练计划。
                </p>
                <div className="space-y-3">
                  {sentenceAssessmentItems.map((item, index) => (
                    <Card key={item.id} className="space-y-2 border-zinc-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-zinc-300">{index + 1}. {item.question}</p>
                        <PronunciationButton pronunciation={item.question_pronunciation} label="Play prompt" />
                      </div>
                      <Input
                        value={assessmentAnswers[item.id] ?? ''}
                        placeholder="请输入你的答案"
                        onChange={(event) => setAssessmentAnswers((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      />
                    </Card>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOnboardingStep(2)}>
                    上一步
                  </Button>
                  <Button onClick={() => void submitAssessment()} disabled={submittingAssessment}>
                    {submittingAssessment ? 'Submitting...' : '提交测试'}
                  </Button>
                </div>
              </div>
            )}
            {onboardingStep === 4 && learningStatus?.plan_generation_required && learningStatus.profile && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">水平测试已完成。请先确认用户画像，再生成学习计划。</p>
                <div className="space-y-2 rounded-md border border-zinc-800 p-4 text-sm text-zinc-300">
                  <p>学习目标：{learningStatus.profile.goal}</p>
                  <p>每日学习时长：{learningStatus.profile.daily_minutes} 分钟</p>
                  <p>学习时间段：{learningStatus.profile.study_time_range || '待设置'}</p>
                  <p>单词 Level：{learningStatus.profile.word_level}</p>
                  <p>句子 Level：{learningStatus.profile.sentence_level}</p>
                  <p>综合 Level：{learningStatus.profile.overall_level}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOnboardingStep(3)}>
                    上一步
                  </Button>
                  <Button onClick={() => void generatePlan()} disabled={generatingPlan}>
                    {generatingPlan ? 'Generating...' : '生成学习计划'}
                  </Button>
                </div>
              </div>
            )}
            {onboardingStep === 5 && !learningStatus?.goal_required && !learningStatus?.assessment_required && !learningStatus?.plan_generation_required && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">学习计划已生成，你可以先预览，再开始今日任务。</p>
                <div className="space-y-3">
                  {learningStatus?.items.map((item) => (
                    <Card key={item.id} className="space-y-2 border-zinc-700">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-zinc-400">{item.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                        <span>Lv{item.level}</span>
                        <span>{item.numbers} 题</span>
                        <span>约 {item.estimated_minutes} 分钟</span>
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={confirmOnboardingPlan}>
                    确认并关闭
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
