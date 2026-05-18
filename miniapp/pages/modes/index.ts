import { learningPlanService } from '../../services/learningPlan'
import { clearSession, getSelectedMode, getStorageUser, setSelectedMode } from '../../utils/session'
import { requireLogin } from '../../utils/guard'
import { miniappConfig } from '../../utils/config'
import type { LearningPlanBundle } from '../../types/learningPlan'
import type { StudyMode } from '../../types/mode'

let pronunciationPlayer: WechatMiniprogram.InnerAudioContext | null = null

const resolveAudioURL = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `${miniappConfig.apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`

type ModePageData = {
  loading: boolean
  savingGoal: boolean
  submittingAssessment: boolean
  error: string
  bundle: LearningPlanBundle
  visibleItems: LearningPlanBundle['items']
  selectedType: number
  selectedModeID: number
  userName: string
  goal: string
  assessmentAnswers: string[]
}

Page<ModePageData>({
  data: {
    loading: false,
    savingGoal: false,
    submittingAssessment: false,
    error: '',
    bundle: {
      assessment_items: [],
      items: [],
      goal_required: false,
      assessment_required: false,
    },
    visibleItems: [],
    selectedType: 2,
    selectedModeID: getSelectedMode()?.id ?? 0,
    userName: getStorageUser()?.name ?? '同学',
    goal: '',
    assessmentAnswers: [],
  },
  onShow() {
    if (!requireLogin()) return
    void this.loadStatus()
  },
  async loadStatus() {
    this.setData({ loading: true, error: '' })
    try {
      const bundle = await learningPlanService.current()
      const shouldClearMode = bundle.goal_required || bundle.assessment_required
      if (shouldClearMode) {
        setSelectedMode(null)
      }
      this.setData({
        bundle,
        visibleItems: bundle.items.filter((item) => item.study_type === this.data.selectedType),
        selectedModeID: shouldClearMode ? 0 : this.data.selectedModeID,
        goal: bundle.profile?.goal ?? '',
        assessmentAnswers: bundle.assessment_items.map((item) => item.user_answer ?? ''),
      })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '加载学习状态失败',
      })
    } finally {
      this.setData({ loading: false })
    }
  },
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
  async saveGoal() {
    this.setData({ savingGoal: true, error: '' })
    try {
      const bundle = await learningPlanService.setGoal({ goal: this.data.goal.trim() })
      setSelectedMode(null)
      this.setData({
        bundle,
        visibleItems: bundle.items.filter((item) => item.study_type === this.data.selectedType),
        selectedModeID: 0,
        assessmentAnswers: bundle.assessment_items.map((item) => item.user_answer ?? ''),
      })
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
    this.setData({
      assessmentAnswers: next,
    })
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
      this.setData({
        bundle,
        visibleItems: bundle.items.filter((item) => item.study_type === this.data.selectedType),
        selectedModeID: 0,
        assessmentAnswers: [],
      })
      wx.showToast({ title: '测试已完成', icon: 'success' })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '提交测试失败',
      })
    } finally {
      this.setData({ submittingAssessment: false })
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
    this.setData({ selectedModeID: mode.id })
    wx.showToast({ title: '已选择任务', icon: 'success' })
  },
  goPractice() {
    if (this.data.bundle.goal_required || this.data.bundle.assessment_required) {
      wx.showToast({ title: '请先完成目标设置或测评', icon: 'none' })
      return
    }
    if (!this.data.selectedModeID) {
      wx.showToast({ title: '请先选择任务', icon: 'none' })
      return
    }
    wx.switchTab({ url: '/pages/practice/index' })
  },
  onLogout() {
    clearSession()
    wx.reLaunch({ url: '/pages/login/index' })
  },
  onUnload() {
    pronunciationPlayer?.stop()
  },
})
