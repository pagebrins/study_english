const { modeService } = require('../../services/mode')
const { questionService } = require('../../services/question')
const { scoreService } = require('../../services/score')
const { requireLogin } = require('../../utils/guard')
const { setExplainContext } = require('../../utils/session')

Page({
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
  },
  onShow() {
    if (!requireLogin()) return
    void this.bootstrap()
  },
  async bootstrap() {
    this.setData({ loading: true, error: '' })
    try {
      const [modes, items, today] = await Promise.all([
        modeService.list(this.data.selectedType),
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
            : (modes.find((item) => item.id === this.data.selectedModeID) || {}).name || '全部模式',
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
  onTypeChange(event) {
    const selectedIndex = Number(event.detail.value)
    const selectedType = selectedIndex + 1
    this.setData({ selectedType, selectedModeID: 0, selectedModeName: '全部模式' })
    void this.bootstrap()
  },
  onModeChange(event) {
    const selectedIndex = Number(event.detail.value)
    const selectedModeID = this.data.modeOptionIDs[selectedIndex] || 0
    const selectedMode =
      selectedModeID === 0 ? undefined : this.data.modes.find((item) => item.id === selectedModeID)
    this.setData({
      selectedModeID,
      selectedModeName: (selectedMode && selectedMode.name) || '全部模式',
    })
    void this.bootstrap()
  },
  askAI(event) {
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
  syncExplainContext(items) {
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
})
