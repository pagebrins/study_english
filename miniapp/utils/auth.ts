import { setStorageToken, setStorageUser } from './session'
import { authService } from '../services/auth'

export const ensureWechatLogin = async () => {
  const loginResult = await new Promise<WechatMiniprogram.LoginSuccessCallbackResult>((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: reject,
    })
  })
  if (!loginResult.code) {
    throw new Error('未获取到微信登录凭证')
  }
  const result = await authService.wechatLogin(loginResult.code)
  setStorageToken(result.token)
  setStorageUser(result.user)
  return result
}
