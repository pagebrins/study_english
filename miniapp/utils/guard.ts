import { isLoggedIn } from './session'

export const requireLogin = () => {
  if (!isLoggedIn()) {
    wx.reLaunch({ url: '/pages/login/index' })
    return false
  }
  return true
}
