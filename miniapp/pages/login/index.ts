import { ensureWechatLogin } from '../../utils/auth'
import { isLoggedIn } from '../../utils/session'

const isPlaceholderNickname = (nickname: string) => {
  const value = nickname.trim()
  return !value || value === '微信用户' || value.startsWith('微信用户')
}

Page({
  data: {
    loading: false,
    error: '',
    nickname: '',
  },
  onShow() {
    if (isLoggedIn()) {
      wx.switchTab({ url: '/pages/dashboard/index' })
    }
  },
  async doWechatLogin(name?: string) {
    if (this.data.loading) return
    this.setData({ loading: true, error: '' })
    try {
      await ensureWechatLogin(name)
      wx.switchTab({ url: '/pages/dashboard/index' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '微信登录失败，请稍后重试'
      this.setData({ error: message })
    } finally {
      this.setData({ loading: false })
    }
  },
  onNicknameInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ nickname: event.detail.value })
  },
  async onUseWechatNickname() {
    try {
      const profile = await new Promise<WechatMiniprogram.GetUserProfileSuccessCallbackResult>((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于登录时补充昵称',
          success: resolve,
          fail: reject,
        })
      })
      const nickname = String(profile.userInfo.nickName || '').trim()
      if (isPlaceholderNickname(nickname)) {
        wx.showToast({ title: '微信未返回可用昵称，请手动填写', icon: 'none' })
        return
      }
      this.setData({ nickname })
      await this.doWechatLogin(nickname)
    } catch (_error) {
      wx.showToast({ title: '未获取到微信昵称', icon: 'none' })
    }
  },
  async onConfirmNickname() {
    const nickname = String(this.data.nickname || '').trim()
    if (isPlaceholderNickname(nickname)) {
      wx.showToast({ title: '请填写一个有效昵称', icon: 'none' })
      return
    }
    await this.doWechatLogin(nickname)
  },
})
