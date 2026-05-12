import { miniappConfig } from './config'
import type { AuthUser } from '../types/auth'
import type { ExplainChatPageContext } from '../types/question'
import type { StudyMode } from '../types/mode'

export const getStorageToken = () => wx.getStorageSync<string>(miniappConfig.storageKeys.token) ?? ''

export const setStorageToken = (token: string) => {
  wx.setStorageSync(miniappConfig.storageKeys.token, token)
  getApp<IAppOption>().globalData.token = token
}

export const clearStorageToken = () => {
  wx.removeStorageSync(miniappConfig.storageKeys.token)
  getApp<IAppOption>().globalData.token = ''
}

export const getStorageUser = () =>
  wx.getStorageSync<AuthUser>(miniappConfig.storageKeys.user) ?? null

export const setStorageUser = (user: AuthUser) => {
  wx.setStorageSync(miniappConfig.storageKeys.user, user)
  getApp<IAppOption>().globalData.user = user
}

export const clearStorageUser = () => {
  wx.removeStorageSync(miniappConfig.storageKeys.user)
  getApp<IAppOption>().globalData.user = null
}

export const getSelectedMode = () =>
  wx.getStorageSync<StudyMode>(miniappConfig.storageKeys.selectedMode) ?? null

export const setSelectedMode = (mode: StudyMode | null) => {
  if (!mode) {
    wx.removeStorageSync(miniappConfig.storageKeys.selectedMode)
  } else {
    wx.setStorageSync(miniappConfig.storageKeys.selectedMode, mode)
  }
  getApp<IAppOption>().globalData.selectedMode = mode
}

export const getExplainContext = () =>
  wx.getStorageSync<ExplainChatPageContext>(miniappConfig.storageKeys.explainContext) ?? null

export const setExplainContext = (context: ExplainChatPageContext | null) => {
  if (!context) {
    wx.removeStorageSync(miniappConfig.storageKeys.explainContext)
  } else {
    wx.setStorageSync(miniappConfig.storageKeys.explainContext, context)
  }
  getApp<IAppOption>().globalData.explainContext = context
}

export const clearSession = () => {
  clearStorageToken()
  clearStorageUser()
  setSelectedMode(null)
  setExplainContext(null)
}

export const isLoggedIn = () => Boolean(getStorageToken())
