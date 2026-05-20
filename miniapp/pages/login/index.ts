import { ensureWechatLogin } from '../../utils/auth'
import { isLoggedIn } from '../../utils/session'

Page({
  data: {
    loading: false,
    error: '',
    showNamePrompt: false,
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
      if (message.includes('first wechat login requires name')) {
        this.setData({ showNamePrompt: true, error: '' })
        wx.showToast({ title: '首次登录请先设置昵称', icon: 'none' })
        return
      }
      this.setData({ error: message })
    } finally {
      this.setData({ loading: false })
    }
  },
  onWechatLogin() {
    this.setData({ showNamePrompt: true, error: '' })
  },
  onNicknameInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ nickname: event.detail.value })
  },
  async onUseWechatNickname() {
    try {
      const profile = await new Promise<WechatMiniprogram.GetUserProfileSuccessCallbackResult>((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于首次登录时补充昵称',
          success: resolve,
          fail: reject,
        })
      })
      this.setData({ nickname: profile.userInfo.nickName || '' })
    } catch (_error) {
      wx.showToast({ title: '未获取到微信昵称', icon: 'none' })
    }
  },
  async onConfirmNickname() {
    const nickname = String(this.data.nickname || '').trim()
    if (!nickname) {
      wx.showToast({ title: '请先填写昵称', icon: 'none' })
      return
    }
    await this.doWechatLogin(nickname)
  },
  async onDirectWechatLogin() {
    await this.doWechatLogin()
  },
  onCloseNamePrompt() {
    this.setData({ showNamePrompt: false, error: '' })
  },
})
