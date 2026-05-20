import { learningPlanService } from '../../services/learningPlan'
import { questionService } from '../../services/question'
import { scoreService } from '../../services/score'
import { requireLogin } from '../../utils/guard'
import { hasAnyPermission, hasPermission } from '../../utils/permission'
import { getSelectedMode, getStorageUser, setSelectedMode } from '../../utils/session'
import type { LearningPlanBundle, LearningPlanItem } from '../../types/learningPlan'
import type { StudyMode } from '../../types/mode'
import type { UserQuestion } from '../../types/question'

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
}

const emptyBundle: LearningPlanBundle = {
  assessment_items: [],
  items: [],
  goal_required: false,
  assessment_required: false,
  plan_generation_required: false,
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
      })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '加载学习总览失败',
      })
    } finally {
      this.setData({ loading: false })
    }
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
    this.setData({ selectedModeName: mode.name })
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
