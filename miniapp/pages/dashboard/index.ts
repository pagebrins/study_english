import { learningPlanService } from '../../services/learningPlan'
import { questionService } from '../../services/question'
import { scoreService } from '../../services/score'
import { requireLogin } from '../../utils/guard'
import { getStorageUser, setSelectedMode } from '../../utils/session'
import type { LearningPlanBundle, LearningPlanItem } from '../../types/learningPlan'
import type { StudyMode } from '../../types/mode'
import type { UserQuestion } from '../../types/question'

type DashboardData = {
  loading: boolean
  error: string
  userName: string
  selectedType: number
  bundle: LearningPlanBundle
  visibleItems: LearningPlanItem[]
  recentItems: UserQuestion[]
  todayScore: number
  todayAnswered: number
}

const emptyBundle: LearningPlanBundle = {
  assessment_items: [],
  items: [],
  goal_required: false,
  assessment_required: false,
}

Page<DashboardData>({
  data: {
    loading: false,
    error: '',
    userName: getStorageUser()?.name ?? '同学',
    selectedType: 2,
    bundle: emptyBundle,
    visibleItems: [],
    recentItems: [],
    todayScore: 0,
    todayAnswered: 0,
  },
  onShow() {
    if (!requireLogin()) return
    this.setData({ userName: getStorageUser()?.name ?? '同学' })
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
      this.setData({
        bundle,
        visibleItems: bundle.items.filter((item) => item.study_type === this.data.selectedType),
        recentItems: recentItems.slice(0, 6),
        todayScore: today.score,
        todayAnswered: today.answered,
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
    void this.loadDashboard()
  },
  onChooseTask(event: WechatMiniprogram.CustomEvent) {
    const itemID = Number(event.currentTarget.dataset.id)
    const selected = this.data.visibleItems.find((item) => item.id === itemID)
    if (!selected?.mode_id) return
    const mode: StudyMode = {
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
    setSelectedMode(mode)
    wx.showToast({ title: '已切换到该任务', icon: 'success' })
  },
  goStudy() {
    wx.switchTab({ url: '/pages/study/index' })
  },
  goPractice() {
    wx.switchTab({ url: '/pages/practice/index' })
  },
  goHistory() {
    wx.switchTab({ url: '/pages/history/index' })
  },
  goSettings() {
    wx.switchTab({ url: '/pages/settings/index' })
  },
})
