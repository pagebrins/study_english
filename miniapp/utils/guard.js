const { isLoggedIn } = require('./session')

const requireLogin = () => {
  if (!isLoggedIn()) {
    wx.reLaunch({ url: '/pages/login/index' })
    return false
  }
  return true
}

module.exports = {
  requireLogin,
}
