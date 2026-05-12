const { modeService } = require('../../services/mode')
const { clearSession, getSelectedMode, getStorageUser, setSelectedMode } = require('../../utils/session')
const { requireLogin } = require('../../utils/guard')

Page({
  data: {
    loading: false,
    error: '',
    modes: [],
    selectedType: 2,
    selectedModeID: (getSelectedMode() && getSelectedMode().id) || 0,
    userName: (getStorageUser() && getStorageUser().name) || '同学',
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
  onTypeChange(event) {
    const selectedType = Number(event.currentTarget.dataset.value)
    this.setData({ selectedType, selectedModeID: 0 })
    setSelectedMode(null)
    void this.loadModes()
  },
  onChooseMode(event) {
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
