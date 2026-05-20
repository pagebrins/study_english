import { learningPlanService } from '../../services/learningPlan'
import { questionService } from '../../services/question'
import { scoreService } from '../../services/score'
import { requireLogin } from '../../utils/guard'
import { hasAnyPermission, hasPermission } from '../../utils/permission'
import { getSelectedMode, getStorageUser, setSelectedMode } from '../../utils/session'
import type { LearningPlanBundle, LearningPlanItem } from '../../types/learningPlan'
import type { StudyMode } from '../../types/mode'
import type { UserQuestion } from '../../types/question'

type OverviewCalendarDay = {
  key: string
  label: string
  day: string
  dateNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isPlanDay: boolean
  isAssessmentDay: boolean
  isStudied: boolean
  isMissed: boolean
}

type DashboardData = {
  loading: boolean
  error: string
  userName: string
  roleName: string
  selectedType: number
  bundle: LearningPlanBundle
  visibleItems: LearningPlanItem[]
  featuredItem: LearningPlanItem | null
  recentItems: UserQuestion[]
  todayScore: number
  todayAnswered: number
  plannedMinutes: number
  selectedModeName: string
  canView: boolean
  canPractice: boolean
  canChat: boolean
  canSettings: boolean
  onboardingIncomplete: boolean
  calendarDays: OverviewCalendarDay[]
  goalSummary: string
  assessmentLabel: string
  calendarMonthLabel: string
}

const emptyBundle: LearningPlanBundle = {
  assessment_items: [],
  items: [],
  goal_required: false,
  assessment_required: false,
  plan_generation_required: false,
}

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDate = (value?: string) => {
  if (!value) return null
  const direct = new Date(value)
  if (!Number.isNaN(direct.getTime())) return direct
  const normalized = new Date(`${value}T00:00:00`)
  if (!Number.isNaN(normalized.getTime())) return normalized
  return null
}

Page<DashboardData>({
  data: {
    loading: false,
    error: '',
    userName: getStorageUser()?.name ?? '同学',
    roleName: getStorageUser()?.role_name ?? 'Learner',
    selectedType: 2,
    bundle: emptyBundle,
    visibleItems: [],
    featuredItem: null,
    recentItems: [],
    todayScore: 0,
    todayAnswered: 0,
    plannedMinutes: 0,
    selectedModeName: getSelectedMode()?.name ?? '',
    canView: true,
    canPractice: false,
    canChat: false,
    canSettings: false,
    onboardingIncomplete: false,
    calendarDays: [],
    goalSummary: '',
    assessmentLabel: '',
    calendarMonthLabel: '',
  },
  onShow() {
    if (!requireLogin()) return
    const tabBar = this.getTabBar?.() as WechatMiniprogram.Component.TrivialInstance | undefined
    tabBar?.setData?.({ selected: 0, showSettingsMenu: false })
    const user = getStorageUser()
    const canView = hasPermission(user, 'dashboard.view')
    const canPractice = hasPermission(user, 'practice.use')
    const canChat = hasPermission(user, 'chat.use')
    const canSettings = hasAnyPermission(user, [
      'settings.theme.manage',
      'settings.knowledge.manage',
      'settings.permission.manage',
    ])

    this.setData({
      userName: user?.name ?? '同学',
      roleName: user?.role_name ?? 'Learner',
      selectedModeName: getSelectedMode()?.name ?? '',
      canView,
      canPractice,
      canChat,
      canSettings,
      error: canView ? '' : '当前账号没有总览页访问权限。',
    })

    if (!canView) return
    void this.loadDashboard()
  },
  async loadDashboard() {
    this.setData({ loading: true, error: '' })
    try {
      const [bundle, today, recentItems] = await Promise.all([
        learningPlanService.current(),
        scoreService.today(this.data.selectedType),
        questionService.list({ type: this.data.selectedType }),
      ])
      const visibleItems = bundle.items.filter((item) => item.study_type === this.data.selectedType)
      const featuredItem = visibleItems[0] ?? null
      const plannedMinutes = visibleItems.reduce((sum, item) => sum + (item.estimated_minutes || 0), 0)
      const calendarDays = this.buildCalendarDays(bundle, recentItems)
      const referenceDate = parseDate(bundle.plan?.plan_date) ?? new Date()
      this.setData({
        bundle,
        onboardingIncomplete: bundle.goal_required || bundle.assessment_required || bundle.plan_generation_required,
        visibleItems,
        featuredItem,
        recentItems: recentItems.slice(0, 4),
        todayScore: today.score,
        todayAnswered: today.answered,
        plannedMinutes,
        selectedModeName: getSelectedMode()?.name ?? '',
        calendarDays,
        goalSummary: bundle.plan?.goal_summary || bundle.profile?.goal || '',
        assessmentLabel: bundle.profile?.last_assessment_at
          ? `入门测试 ${formatDateKey(new Date(bundle.profile.last_assessment_at))}`
          : '入门测试日期待记录',
        calendarMonthLabel: `${referenceDate.getFullYear()}年${referenceDate.getMonth() + 1}月`,
      })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '加载学习总览失败',
      })
    } finally {
      this.setData({ loading: false })
    }
  },
  buildCalendarDays(bundle: LearningPlanBundle, recentItems: UserQuestion[]) {
    const referenceDate = parseDate(bundle.plan?.plan_date) ?? new Date()
    const today = new Date()
    const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
    const start = new Date(monthStart)
    const weekday = monthStart.getDay() || 7
    start.setDate(monthStart.getDate() - (weekday - 1))
    const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
    const planKey = bundle.plan?.plan_date ? formatDateKey(new Date(bundle.plan.plan_date)) : ''
    const assessmentDate = parseDate(bundle.profile?.last_assessment_at)
      ?? parseDate(bundle.assessment?.completed_at)
      ?? parseDate(bundle.assessment?.created_at)
    const assessmentKey = assessmentDate ? formatDateKey(assessmentDate) : ''
    const shouldShowMissed = Boolean(bundle.plan?.plan_date)
    const studiedKeys = new Set(
      recentItems
        .map((item) => parseDate(item.create_time))
        .filter((item): item is Date => Boolean(item))
        .map((item) => formatDateKey(item)),
    )

    const totalCells = Math.ceil((weekday - 1 + monthEnd.getDate()) / 7) * 7
    return Array.from({ length: totalCells }).map((_, index) => {
      const current = new Date(start)
      current.setDate(start.getDate() + index)
      const key = formatDateKey(current)
      const isToday =
        current.getFullYear() === today.getFullYear() &&
        current.getMonth() === today.getMonth() &&
        current.getDate() === today.getDate()
      const isAssessmentDay = Boolean(assessmentKey) && key === assessmentKey
      const isStudied = studiedKeys.has(key)
      const isPlanDay = Boolean(planKey) && key === planKey
      const isMissed =
        shouldShowMissed &&
        current < new Date(today.getFullYear(), today.getMonth(), today.getDate()) &&
        !isStudied &&
        !isAssessmentDay
      return {
        key,
        label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index % 7],
        day: `${current.getMonth() + 1}/${current.getDate()}`,
        dateNumber: current.getDate(),
        isCurrentMonth: current.getMonth() === referenceDate.getMonth(),
        isToday,
        isPlanDay,
        isAssessmentDay,
        isStudied,
        isMissed,
      }
    })
  },
  onTypeChange(event: WechatMiniprogram.CustomEvent) {
    const selectedType = Number(event.currentTarget.dataset.value)
    this.setData({ selectedType })
    if (!this.data.canView) return
    void this.loadDashboard()
  },
  onChooseTask(event: WechatMiniprogram.CustomEvent) {
    const itemID = Number(event.currentTarget.dataset.id)
    const selected = this.data.visibleItems.find((item) => item.id === itemID)
    if (!selected) return
    this.setData({ featuredItem: selected, selectedModeName: selected.name })
    this.applyModeFromItem(selected)
  },
  applyModeFromItem(item?: LearningPlanItem | null) {
    if (!item?.mode_id) return false
    const mode: StudyMode = {
      id: item.mode_id,
      name: item.name,
      description: item.description,
      level: item.level,
      numbers: item.numbers,
      type: item.study_type,
      mode: item.translation_mode,
      source: 'plan_auto',
      plan_item_id: item.id,
      theme_id: item.theme_id,
      theme_path: item.theme_path,
      requirements: item.requirements,
    }
    setSelectedMode(mode)
    this.setData({ selectedModeName: mode.name, featuredItem: item ?? this.data.featuredItem })
    wx.showToast({ title: '已切换任务', icon: 'success' })
    return true
  },
  startOnboarding() {
    getApp<IAppOption>().globalData.openOnboardingModal = true
    wx.switchTab({ url: '/pages/study/index' })
  },
  goStudy() {
    wx.switchTab({ url: '/pages/study/index' })
  },
  goPractice() {
    if (!this.data.canPractice) {
      wx.showToast({ title: '当前账号没有练习权限', icon: 'none' })
      return
    }
    const selectedMode = getSelectedMode()
    if (!selectedMode && !this.applyModeFromItem(this.data.featuredItem)) {
      wx.showToast({ title: '请先去学习页选择任务', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/practice/index' })
  },
  goHistory() {
    wx.switchTab({ url: '/pages/history/index' })
  },
  goSettings() {
    if (!this.data.canSettings) {
      wx.showToast({ title: '当前账号没有设置权限', icon: 'none' })
      return
    }
    wx.switchTab({ url: '/pages/settings/index' })
  },
})
