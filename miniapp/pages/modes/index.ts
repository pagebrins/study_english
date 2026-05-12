import { modeService } from '../../services/mode'
import { clearSession, getSelectedMode, getStorageUser, setSelectedMode } from '../../utils/session'
import { requireLogin } from '../../utils/guard'
import type { StudyMode } from '../../types/mode'

type ModePageData = {
  loading: boolean
  error: string
  modes: StudyMode[]
  selectedType: number
  selectedModeID: number
  userName: string
}

Page<ModePageData>({
  data: {
    loading: false,
    error: '',
    modes: [],
    selectedType: 2,
    selectedModeID: getSelectedMode()?.id ?? 0,
    userName: getStorageUser()?.name ?? '同学',
  },
  onShow() {
    if (!requireLogin()) return
    void this.loadModes()
  },
  async loadModes() {
    this.setData({ loading: true, error: '' })
    try {
      const modes = await modeService.list(this.data.selectedType)
      this.setData({ modes })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '加载模式失败',
      })
    } finally {
      this.setData({ loading: false })
    }
  },
  onTypeChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const selectedType = Number(event.currentTarget.dataset.value)
    this.setData({ selectedType, selectedModeID: 0 })
    setSelectedMode(null)
    void this.loadModes()
  },
  onChooseMode(event: WechatMiniprogram.CustomEvent<{ id: number }>) {
    const modeID = Number(event.currentTarget.dataset.id)
    const selected = this.data.modes.find((item) => item.id === modeID)
    if (!selected) return
    setSelectedMode(selected)
    this.setData({ selectedModeID: selected.id })
    wx.showToast({ title: '已选择模式', icon: 'success' })
  },
  goPractice() {
    if (!this.data.selectedModeID) {
      wx.showToast({ title: '请先选择模式', icon: 'none' })
      return
    }
    wx.switchTab({ url: '/pages/practice/index' })
  },
  onLogout() {
    clearSession()
    wx.reLaunch({ url: '/pages/login/index' })
  },
})
