const { authService } = require('../services/auth')
const { setStorageToken, setStorageUser } = require('./session')

const ensureWechatLogin = async () => {
  const loginResult = await new Promise((resolve, reject) => {
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

module.exports = {
  ensureWechatLogin,
}
