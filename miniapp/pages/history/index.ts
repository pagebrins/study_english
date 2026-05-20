import { learningPlanService } from '../../services/learningPlan'
import { modeService } from '../../services/mode'
import { questionService } from '../../services/question'
import { scoreService } from '../../services/score'
import { requireLogin } from '../../utils/guard'
import { hasPermission } from '../../utils/permission'
import { miniappConfig } from '../../utils/config'
import { getStorageUser, setExplainContext } from '../../utils/session'
import type { StudyMode } from '../../types/mode'
import type { UserQuestion } from '../../types/question'

let historyPronunciationPlayer: WechatMiniprogram.InnerAudioContext | null = null
const resolveAudioURL = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `${miniappConfig.apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`

type HistoryData = {
  loading: boolean
  error: string
  items: UserQuestion[]
  modes: StudyMode[]
  modeOptions: string[]
  modeOptionIDs: number[]
  selectedType: number
  selectedModeID: number
  selectedModeName: string
  score: number
  answered: number
  canView: boolean
  canPractice: boolean
  canChat: boolean
}

Page<HistoryData>({
  data: {
    loading: false,
    error: '',
    items: [],
    modes: [],
    modeOptions: ['全部模式'],
    modeOptionIDs: [0],
    selectedType: 2,
    selectedModeID: 0,
    selectedModeName: '全部模式',
    score: 0,
    answered: 0,
    canView: true,
    canPractice: false,
    canChat: false,
  },
  onShow() {
    if (!requireLogin()) return
    const tabBar = this.getTabBar?.() as WechatMiniprogram.Component.TrivialInstance | undefined
    tabBar?.setData?.({ selected: 2, showSettingsMenu: false })
    const user = getStorageUser()
    const canView = hasPermission(user, 'history.view')
    const canPractice = hasPermission(user, 'practice.use')
    const canChat = hasPermission(user, 'chat.use')
    this.setData({
      canView,
      canPractice,
      canChat,
      error: canView ? '' : '当前账号没有历史页访问权限。',
    })
    if (!canView) return
    void this.bootstrap()
  },
  async bootstrap() {
    this.setData({ loading: true, error: '' })
    try {
      const [modes, items, today] = await Promise.all([
        modeService.list({ type: this.data.selectedType }),
        questionService.list({
          type: this.data.selectedType,
          mode_ids: this.data.selectedModeID ? [this.data.selectedModeID] : undefined,
        }),
        scoreService.today(this.data.selectedType),
      ])
      this.setData({
        modes,
        modeOptions: ['全部模式', ...modes.map((item) => item.name)],
        modeOptionIDs: [0, ...modes.map((item) => item.id)],
        items,
        selectedModeName:
          this.data.selectedModeID === 0
            ? '全部模式'
            : modes.find((item) => item.id === this.data.selectedModeID)?.name ?? '全部模式',
        score: today.score,
        answered: today.answered,
      })
      this.syncExplainContext(items)
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '加载历史记录失败',
      })
    } finally {
      this.setData({ loading: false })
    }
  },
  onTypeChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const selectedIndex = Number(event.detail.value)
    const selectedType = selectedIndex + 1
    this.setData({ selectedType, selectedModeID: 0 })
    void this.bootstrap()
  },
  onModeChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const selectedIndex = Number(event.detail.value)
    const selectedModeID = this.data.modeOptionIDs[selectedIndex] ?? 0
    const selectedMode =
      selectedModeID === 0 ? undefined : this.data.modes.find((item) => item.id === selectedModeID)
    this.setData({
      selectedModeID,
      selectedModeName: selectedMode?.name ?? '全部模式',
    })
    void this.bootstrap()
  },
  askAI(event: WechatMiniprogram.CustomEvent) {
    if (!this.data.canChat) {
      wx.showToast({ title: '当前账号没有 AI 讲解权限', icon: 'none' })
      return
    }
    const index = Number(event.currentTarget.dataset.index)
    const question = this.data.items[index]
    if (!question) return
    setExplainContext({
      page: 'history',
      current_question_index: index + 1,
      question_snapshots: this.data.items.map((item, itemIndex) => ({
        question_id: item.id,
        index: itemIndex + 1,
        question: item.question,
        answer_key: item.answer_key,
        user_answer: item.answer_text,
      })),
    })
    wx.navigateTo({ url: '/pages/chat/index?source=history' })
  },
  playPronunciation(event: WechatMiniprogram.CustomEvent<{ url: string }>) {
    const url = String(event.currentTarget.dataset.url || '')
    if (!url) return
    if (!historyPronunciationPlayer) {
      historyPronunciationPlayer = wx.createInnerAudioContext()
    }
    historyPronunciationPlayer.src = resolveAudioURL(url)
    historyPronunciationPlayer.play()
  },
  syncExplainContext(items: UserQuestion[]) {
    setExplainContext({
      page: 'history',
      question_snapshots: items.map((item, index) => ({
        question_id: item.id,
        index: index + 1,
        question: item.question,
        answer_key: item.answer_key,
        user_answer: item.answer_text,
      })),
    })
  },
  onUnload() {
    historyPronunciationPlayer?.stop()
  },
  goPractice() {
    if (!this.data.canPractice) {
      wx.showToast({ title: '当前账号没有练习权限', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/practice/index' })
  },
})
