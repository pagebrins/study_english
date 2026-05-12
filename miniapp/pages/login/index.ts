import { ensureWechatLogin } from '../../utils/auth'
import { isLoggedIn } from '../../utils/session'

Page({
  data: {
    loading: false,
    error: '',
  },
  onShow() {
    if (isLoggedIn()) {
      wx.switchTab({ url: '/pages/modes/index' })
    }
  },
  async onWechatLogin() {
    if (this.data.loading) return
    this.setData({ loading: true, error: '' })
    try {
      await ensureWechatLogin()
      wx.switchTab({ url: '/pages/modes/index' })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '微信登录失败，请稍后重试',
      })
    } finally {
      this.setData({ loading: false })
    }
  },
})
