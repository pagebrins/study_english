import { learningPlanService } from '../../services/learningPlan'
import { questionService } from '../../services/question'
import { clearSession, getSelectedMode, getStorageUser, setSelectedMode } from '../../utils/session'
import { requireLogin } from '../../utils/guard'
import { miniappConfig } from '../../utils/config'
import type { LearningPlanBundle, LearningPlanItem } from '../../types/learningPlan'
import type { GeneratedQuestion } from '../../types/question'
import type { StudyMode } from '../../types/mode'

let pronunciationPlayer: WechatMiniprogram.InnerAudioContext | null = null

const resolveAudioURL = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `${miniappConfig.apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`

type CalendarDay = {
  key: string
  label: string
  day: string
  isToday: boolean
  isPlanDay: boolean
}

type ModePageData = {
  generatingPlan: boolean
  loading: boolean
  generatingQuestions: boolean
  savingGoal: boolean
  submittingAssessment: boolean
  startingAssessment: boolean
  error: string
  bundle: LearningPlanBundle
  visibleItems: LearningPlanBundle['items']
  selectedPlanItem: LearningPlanItem | null
  selectedType: number
  selectedModeID: number
  userName: string
  generated: GeneratedQuestion[]
  answers: string[]
  issues: string[][]
  submittingAnswerIndex: number
  goal: string
  dailyMinutes: number
  studyTimeRange: string
  onboardingStep: number
  assessmentAnswers: string[]
  calendarDays: CalendarDay[]
  suggestedGoal: string
  showOnboardingModal: boolean
  onboardingIncomplete: boolean
}

const fallbackGoal = '完成初始水平测试后制定学习目标'

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parsePlanDate = (value?: string) => {
  if (!value) return null
  const direct = new Date(value)
  if (!Number.isNaN(direct.getTime())) return direct
  const normalized = new Date(`${value}T00:00:00`)
  if (!Number.isNaN(normalized.getTime())) return normalized
  return null
}

const buildModeFromItem = (selected: LearningPlanItem): StudyMode | null => {
  if (!selected.mode_id) return null
  return {
    id: selected.mode_id,
    name: selected.name,
    description: selected.description,
    level: selected.level,
    numbers: selected.numbers,
    type: selected.study_type,
    mode: selected.translation_mode,
    source: 'plan_auto',
    plan_item_id: selected.id,
    theme_id: selected.theme_id,
    theme_path: selected.theme_path,
    requirements: selected.requirements,
  }
}

Page<ModePageData>({
  data: {
    loading: false,
    generatingPlan: false,
    generatingQuestions: false,
    savingGoal: false,
    submittingAssessment: false,
    startingAssessment: false,
    error: '',
    bundle: {
      assessment_items: [],
      items: [],
      goal_required: false,
      assessment_required: false,
      plan_generation_required: false,
    },
    visibleItems: [],
    selectedPlanItem: null,
    selectedType: 2,
    selectedModeID: getSelectedMode()?.id ?? 0,
    userName: getStorageUser()?.name ?? '同学',
    generated: [],
    answers: [],
    issues: [],
    submittingAnswerIndex: -1,
    goal: '',
    dailyMinutes: 20,
    studyTimeRange: '',
    onboardingStep: 1,
    assessmentAnswers: [],
    calendarDays: [],
    suggestedGoal: fallbackGoal,
    showOnboardingModal: false,
    onboardingIncomplete: false,
  },
  async onShow() {
    if (!requireLogin()) return
    const tabBar = this.getTabBar?.() as WechatMiniprogram.Component.TrivialInstance | undefined
    tabBar?.setData?.({ selected: 1, showSettingsMenu: false })
    await this.loadStatus()
    if (getApp<IAppOption>().globalData.openOnboardingModal && this.data.onboardingIncomplete) {
      this.setData({ showOnboardingModal: true })
      getApp<IAppOption>().globalData.openOnboardingModal = false
    } else if (!this.data.onboardingIncomplete && this.data.selectedPlanItem?.mode_id) {
      void this.generateQuestionsForPlan(this.data.selectedPlanItem.mode_id)
    }
  },
  buildCalendarDays(planDate?: string) {
    const parsedPlanDate = parsePlanDate(planDate)
    const target = parsedPlanDate ?? new Date()
    const today = new Date()
    const start = new Date(target)
    const planKey = parsedPlanDate ? formatDateKey(parsedPlanDate) : ''
    const weekday = start.getDay() || 7
    start.setDate(start.getDate() - (weekday - 1))
    const labels = ['一', '二', '三', '四', '五', '六', '日']
    return labels.map((label, index) => {
      const current = new Date(start)
      current.setDate(start.getDate() + index)
      const key = formatDateKey(current)
      const month = current.getMonth() + 1
      const date = current.getDate()
      return {
        key,
        label,
        day: `${month}/${date}`,
        isToday:
          current.getFullYear() === today.getFullYear() &&
          current.getMonth() === today.getMonth() &&
          current.getDate() === today.getDate(),
        isPlanDay: Boolean(planKey) && key === planKey,
      }
    })
  },
  syncBundle(bundle: LearningPlanBundle, selectedModeID?: number) {
    const onboardingIncomplete = bundle.goal_required || bundle.assessment_required || bundle.plan_generation_required
    if (onboardingIncomplete) {
      setSelectedMode(null)
    }
    const wordIncomplete = bundle.assessment_required && bundle.assessment_items
      .filter((item) => item.study_type === 1)
      .some((item) => !(item.user_answer ?? '').trim())
    const onboardingStep = bundle.goal_required
      ? 1
      : bundle.assessment_required
        ? (wordIncomplete ? 2 : 3)
        : bundle.plan_generation_required
          ? 4
          : 5

    const visibleItems = bundle.items
    const nextSelected = onboardingIncomplete
      ? null
      : visibleItems.find((item) => item.mode_id === (selectedModeID ?? this.data.selectedModeID)) ?? visibleItems[0] ?? null
    const nextMode = nextSelected ? buildModeFromItem(nextSelected) : null
    setSelectedMode(nextMode)

    this.setData({
      bundle,
      onboardingIncomplete,
      visibleItems,
      selectedPlanItem: nextSelected,
      selectedType: nextSelected?.study_type ?? this.data.selectedType,
      selectedModeID: onboardingIncomplete ? 0 : (nextSelected?.mode_id ?? 0),
      generated: onboardingIncomplete ? [] : this.data.generated,
      answers: onboardingIncomplete ? [] : this.data.answers,
      issues: onboardingIncomplete ? [] : this.data.issues,
      submittingAnswerIndex: onboardingIncomplete ? -1 : this.data.submittingAnswerIndex,
      goal: bundle.profile?.goal && bundle.profile.goal !== fallbackGoal ? bundle.profile.goal : '',
      dailyMinutes: bundle.profile?.daily_minutes ?? this.data.dailyMinutes,
      studyTimeRange: bundle.profile?.study_time_range ?? this.data.studyTimeRange,
      assessmentAnswers: bundle.assessment_items.map((item) => item.user_answer ?? ''),
      calendarDays: this.buildCalendarDays(bundle.plan?.plan_date),
      onboardingStep,
      showOnboardingModal: onboardingIncomplete ? this.data.showOnboardingModal : false,
    })
  },
  async loadStatus() {
    this.setData({ loading: true, error: '' })
    try {
      const bundle = await learningPlanService.current()
      this.syncBundle(bundle)
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '加载学习状态失败',
      })
    } finally {
      this.setData({ loading: false })
    }
  },
  openOnboardingModal() {
    this.setData({ showOnboardingModal: true })
  },
  closeOnboardingModal() {
    this.setData({ showOnboardingModal: false })
    getApp<IAppOption>().globalData.openOnboardingModal = false
  },
  noop() {},
  onTypeChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const selectedType = Number(event.currentTarget.dataset.value)
    this.setData({
      selectedType,
      visibleItems: this.data.bundle.items.filter((item) => item.study_type === selectedType),
    })
  },
  onGoalInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ goal: event.detail.value })
  },
  onDailyMinutesInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ dailyMinutes: Number(event.detail.value) || 0 })
  },
  onStudyTimeRangeInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ studyTimeRange: event.detail.value })
  },
  async startInitialAssessment() {
    if (this.data.startingAssessment) return
    this.setData({ startingAssessment: true, error: '' })
    try {
      const bundle = await learningPlanService.setGoal({
        goal: this.data.goal.trim() || this.data.suggestedGoal,
        daily_minutes: Math.max(1, this.data.dailyMinutes || 20),
        study_time_range: this.data.studyTimeRange.trim(),
      })
      setSelectedMode(null)
      this.syncBundle(bundle, 0)
      wx.showToast({ title: '目标已保存', icon: 'success' })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '启动水平测试失败',
      })
    } finally {
      this.setData({ startingAssessment: false })
    }
  },
  async saveGoal() {
    this.setData({ savingGoal: true, error: '' })
    try {
      const bundle = await learningPlanService.setGoal({
        goal: this.data.goal.trim() || this.data.suggestedGoal,
        daily_minutes: Math.max(1, this.data.dailyMinutes || 20),
        study_time_range: this.data.studyTimeRange.trim(),
      })
      setSelectedMode(null)
      this.syncBundle(bundle, 0)
      wx.showToast({ title: '目标已保存', icon: 'success' })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '保存目标失败',
      })
    } finally {
      this.setData({ savingGoal: false })
    }
  },
  onAssessmentAnswerInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(event.currentTarget.dataset.index)
    const next = [...this.data.assessmentAnswers]
    next[index] = event.detail.value
    this.setData({ assessmentAnswers: next })
  },
  goSentenceStep() {
    const wordIndexes = this.data.bundle.assessment_items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.study_type === 1)
    const hasEmpty = wordIndexes.some(({ index }) => !(this.data.assessmentAnswers[index] ?? '').trim())
    if (hasEmpty) {
      wx.showToast({ title: '请先完成单词测试', icon: 'none' })
      return
    }
    this.setData({ onboardingStep: 3 })
  },
  backToWordStep() {
    this.setData({ onboardingStep: 2 })
  },
  async submitAssessment() {
    const assessment = this.data.bundle.assessment
    if (!assessment) return
    this.setData({ submittingAssessment: true, error: '' })
    try {
      const bundle = await learningPlanService.submitAssessment({
        assessment_id: assessment.id,
        answers: this.data.bundle.assessment_items.map((item, index) => ({
          item_id: item.id,
          user_answer: this.data.assessmentAnswers[index] ?? '',
        })),
      })
      setSelectedMode(null)
      this.syncBundle(bundle, 0)
      wx.showToast({ title: '测试已完成', icon: 'success' })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '提交测试失败',
      })
    } finally {
      this.setData({ submittingAssessment: false })
    }
  },
  async generatePlan() {
    if (this.data.generatingPlan) return
    this.setData({ generatingPlan: true, error: '' })
    try {
      const bundle = await learningPlanService.generate()
      setSelectedMode(null)
      this.syncBundle(bundle, 0)
      this.setData({ showOnboardingModal: false })
      const firstPlan = bundle.items.find((item) => item.mode_id)
      if (firstPlan?.mode_id) {
        void this.generateQuestionsForPlan(firstPlan.mode_id)
      }
      wx.showToast({ title: '学习计划已生成', icon: 'success' })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '生成学习计划失败',
      })
    } finally {
      this.setData({ generatingPlan: false })
    }
  },
  async generateQuestionsForPlan(modeID: number) {
    if (!modeID || this.data.generatingQuestions) return
    this.setData({
      generatingQuestions: true,
      error: '',
      generated: [],
      answers: [],
      issues: [],
      submittingAnswerIndex: -1,
    })
    try {
      const generated = await questionService.generate(modeID)
      this.setData({
        generated,
        answers: generated.map(() => ''),
        issues: generated.map(() => []),
      })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '生成题目失败',
      })
    } finally {
      this.setData({ generatingQuestions: false })
    }
  },
  onAnswerInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(event.currentTarget.dataset.index)
    const answers = [...this.data.answers]
    answers[index] = event.detail.value
    this.setData({ answers })
  },
  async submitAnswer(event: WechatMiniprogram.CustomEvent) {
    const index = Number(event.currentTarget.dataset.index)
    const current = this.data.generated[index]
    const modeID = this.data.selectedModeID
    if (!current || !modeID || this.data.submittingAnswerIndex === index) return
    const answer = this.data.answers[index] ?? ''
    this.setData({ submittingAnswerIndex: index, error: '' })
    try {
      const issues = await questionService.analyze({
        mode_id: modeID,
        question: current.question,
        answer_text: answer,
        answer_key: current.answer_key,
      })
      const issueMatrix = [...this.data.issues]
      issueMatrix[index] = issues
      this.setData({ issues: issueMatrix })
      await questionService.create({
        mode_id: modeID,
        question: current.question,
        answer_key: current.answer_key,
        answer_text: answer,
        score: issues.length === 0 ? 100 : Math.max(60, 100 - issues.length * 10),
        pre_generated_id: current.pre_generated_id,
      })
      wx.showToast({ title: '已提交', icon: 'success' })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '提交答案失败',
      })
    } finally {
      this.setData({ submittingAnswerIndex: -1 })
    }
  },
  playPronunciation(event: WechatMiniprogram.CustomEvent<{ url: string }>) {
    const url = String(event.currentTarget.dataset.url || '')
    if (!url) return
    if (!pronunciationPlayer) {
      pronunciationPlayer = wx.createInnerAudioContext()
    }
    pronunciationPlayer.src = resolveAudioURL(url)
    pronunciationPlayer.play()
  },
  onChooseTask(event: WechatMiniprogram.CustomEvent<{ id: number }>) {
    const itemID = Number(event.currentTarget.dataset.id)
    const selected = this.data.visibleItems.find((item) => item.id === itemID)
    if (!selected) return
    const mode = buildModeFromItem(selected)
    if (!mode) return
    setSelectedMode(mode)
    this.setData({
      selectedPlanItem: selected,
      selectedModeID: mode.id,
      selectedType: selected.study_type,
    })
    void this.generateQuestionsForPlan(mode.id)
  },
  onLogout() {
    clearSession()
    wx.reLaunch({ url: '/pages/login/index' })
  },
  onUnload() {
    pronunciationPlayer?.stop()
  },
})
