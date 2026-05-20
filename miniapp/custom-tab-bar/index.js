const { learningPlanService } = require('../services/learningPlan')
const { clearSession, getStorageUser } = require('../utils/session')

Component({
  data: {
    selected: 0,
    showSettingsMenu: false,
    canManageTheme: false,
    canManageKnowledge: false,
    canManagePermission: false,
  },
  lifetimes: {
    attached() {
      this.syncFromRoute()
      this.syncPermissions()
    },
  },
  pageLifetimes: {
    show() {
      this.syncFromRoute()
      this.setData({ showSettingsMenu: false })
    },
  },
  methods: {
    syncFromRoute() {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      const route = (current && current.route) || ''
      const selected = route.includes('pages/dashboard')
        ? 0
        : route.includes('pages/study')
          ? 1
          : route.includes('pages/history')
            ? 2
            : route.includes('pages/settings')
              ? 3
              : 0
      this.setData({ selected })
    },
    syncPermissions() {
      const user = getStorageUser()
      const permissions = (user && user.permissions) || []
      this.setData({
        canManageTheme: permissions.includes('settings.theme.manage'),
        canManageKnowledge: permissions.includes('settings.knowledge.manage'),
        canManagePermission: permissions.includes('settings.permission.manage'),
      })
    },
    switchTab(event) {
      const path = String(event.currentTarget.dataset.path || '')
      const selected = Number(event.currentTarget.dataset.index || 0)
      if (!path) return

      getApp().globalData.settingsPanel = 'none'
      this.setData({ showSettingsMenu: false, selected })
      wx.switchTab({ url: path })
    },
    toggleSettingsMenu() {
      this.syncPermissions()
      this.setData({ showSettingsMenu: !this.data.showSettingsMenu, selected: 3 })
    },
    openSettingsPanel(event) {
      const panel = String(event.currentTarget.dataset.panel || 'profile')
      getApp().globalData.settingsPanel = panel
      this.setData({ showSettingsMenu: false, selected: 3 })
      wx.switchTab({ url: '/pages/settings/index' })
    },
    logout() {
      clearSession()
      getApp().globalData.settingsPanel = 'none'
      this.setData({ showSettingsMenu: false, selected: 0 })
      wx.reLaunch({ url: '/pages/login/index' })
    },
  },
})
