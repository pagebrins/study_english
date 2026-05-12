const { miniappConfig } = require('./config')

const getStorageToken = () => wx.getStorageSync(miniappConfig.storageKeys.token) || ''

const setStorageToken = (token) => {
  wx.setStorageSync(miniappConfig.storageKeys.token, token)
  getApp().globalData.token = token
}

const clearStorageToken = () => {
  wx.removeStorageSync(miniappConfig.storageKeys.token)
  getApp().globalData.token = ''
}

const getStorageUser = () => wx.getStorageSync(miniappConfig.storageKeys.user) || null

const setStorageUser = (user) => {
  wx.setStorageSync(miniappConfig.storageKeys.user, user)
  getApp().globalData.user = user
}

const clearStorageUser = () => {
  wx.removeStorageSync(miniappConfig.storageKeys.user)
  getApp().globalData.user = null
}

const getSelectedMode = () => wx.getStorageSync(miniappConfig.storageKeys.selectedMode) || null

const setSelectedMode = (mode) => {
  if (!mode) {
    wx.removeStorageSync(miniappConfig.storageKeys.selectedMode)
  } else {
    wx.setStorageSync(miniappConfig.storageKeys.selectedMode, mode)
  }
  getApp().globalData.selectedMode = mode
}

const getExplainContext = () => wx.getStorageSync(miniappConfig.storageKeys.explainContext) || null

const setExplainContext = (context) => {
  if (!context) {
    wx.removeStorageSync(miniappConfig.storageKeys.explainContext)
  } else {
    wx.setStorageSync(miniappConfig.storageKeys.explainContext, context)
  }
  getApp().globalData.explainContext = context
}

const clearSession = () => {
  clearStorageToken()
  clearStorageUser()
  setSelectedMode(null)
  setExplainContext(null)
}

const isLoggedIn = () => Boolean(getStorageToken())

module.exports = {
  getStorageToken,
  setStorageToken,
  clearStorageToken,
  getStorageUser,
  setStorageUser,
  clearStorageUser,
  getSelectedMode,
  setSelectedMode,
  getExplainContext,
  setExplainContext,
  clearSession,
  isLoggedIn,
}
