import { permissionService } from '../../services/permission'
import { themeService } from '../../services/theme'
import { wordService } from '../../services/word'
import { requireLogin } from '../../utils/guard'
import { hasAnyPermission, hasPermission } from '../../utils/permission'
import { clearSession, getStorageUser } from '../../utils/session'
import type { Permission, Role, UserRoleView } from '../../types/permission'
import type { Theme } from '../../types/theme'
import type { Word } from '../../types/word'

type SettingsPanel = 'profile' | 'theme' | 'word' | 'permission'

type PermissionOption = Permission & {
  checked: boolean
}

type SettingsData = {
  loading: boolean
  error: string
  showSheet: boolean
  activePanel: SettingsPanel
  userName: string
  userEmail: string
  userRoleName: string
  userRoleCode: string
  permissionCodes: string[]
  visiblePermissionCodes: string[]
  canManageTheme: boolean
  canManageKnowledge: boolean
  canManagePermission: boolean
  hasAnySettingsPermission: boolean
  themes: Theme[]
  words: Word[]
  roles: Role[]
  roleNames: string[]
  roleIDs: number[]
  selectedRoleID: number
  selectedRoleName: string
  permissionOptions: PermissionOption[]
  userRoles: UserRoleView[]
  themeEditingID: number
  themeName: string
  themeLevel: number
  themeParentID: number
  themeSortOrder: string
  themeParentNames: string[]
  themeParentIDs: number[]
  themeParentPickerIndex: number
  wordEditingID: number
  wordValue: string
  wordDefinition: string
  wordL1Category: string
  wordL2Category: string
  wordExample: string
  wordTagsText: string
}

const visiblePermissionOrder = [
  'dashboard.view',
  'study.view',
  'history.view',
  'practice.use',
  'chat.use',
  'settings.theme.manage',
  'settings.knowledge.manage',
  'settings.permission.manage',
]

const permissionLabels: Record<string, string> = {
  'dashboard.view': '总览',
  'study.view': '学习',
  'history.view': '历史',
  'practice.use': '练习',
  'chat.use': 'AI 讲解',
  'settings.theme.manage': '主题管理',
  'settings.knowledge.manage': '知识库管理',
  'settings.permission.manage': '权限管理',
}

const normalizeProfilePermissions = (codes: string[]) =>
  visiblePermissionOrder.filter((code) => codes.includes(code))

Page<SettingsData>({
  data: {
    loading: false,
    error: '',
    showSheet: false,
    activePanel: 'profile',
    userName: getStorageUser()?.name ?? '同学',
    userEmail: getStorageUser()?.email ?? '',
    userRoleName: getStorageUser()?.role_name ?? 'Learner',
    userRoleCode: getStorageUser()?.role_code ?? 'learner',
    permissionCodes: getStorageUser()?.permissions ?? [],
    visiblePermissionCodes: normalizeProfilePermissions(getStorageUser()?.permissions ?? []),
    canManageTheme: false,
    canManageKnowledge: false,
    canManagePermission: false,
    hasAnySettingsPermission: false,
    themes: [],
    words: [],
    roles: [],
    roleNames: [],
    roleIDs: [],
    selectedRoleID: 0,
    selectedRoleName: '',
    permissionOptions: [],
    userRoles: [],
    themeEditingID: 0,
    themeName: '',
    themeLevel: 1,
    themeParentID: 0,
    themeSortOrder: '0',
    themeParentNames: ['无父级'],
    themeParentIDs: [0],
    themeParentPickerIndex: 0,
    wordEditingID: 0,
    wordValue: '',
    wordDefinition: '',
    wordL1Category: '',
    wordL2Category: '',
    wordExample: '',
    wordTagsText: '',
  },
  onShow() {
    if (!requireLogin()) return
    const user = getStorageUser()
    const permissionCodes = user?.permissions ?? []
    const canManageTheme = hasPermission(user, 'settings.theme.manage')
    const canManageKnowledge = hasPermission(user, 'settings.knowledge.manage')
    const canManagePermission = hasPermission(user, 'settings.permission.manage')
    const hasAnySettingsPermission = hasAnyPermission(user, [
      'settings.theme.manage',
      'settings.knowledge.manage',
      'settings.permission.manage',
    ])
    const activePanel: SettingsPanel = 'profile'

    this.setData({
      userName: user?.name ?? '同学',
      userEmail: user?.email ?? '',
      userRoleName: user?.role_name ?? 'Learner',
      userRoleCode: user?.role_code ?? 'learner',
      permissionCodes,
      visiblePermissionCodes: normalizeProfilePermissions(permissionCodes),
      canManageTheme,
      canManageKnowledge,
      canManagePermission,
      hasAnySettingsPermission,
      activePanel,
      showSheet: true,
      error: '',
    })
    void this.loadSettings()
  },
  permissionLabel(code: string) {
    return permissionLabels[code] ?? code
  },
  async loadSettings() {
    this.setData({ loading: true, error: '' })
    try {
      const themeTask = this.data.canManageTheme ? themeService.list({ all: true }) : Promise.resolve([])
      const wordTask = this.data.canManageKnowledge ? wordService.list() : Promise.resolve([])
      const permissionSnapshotTask = this.data.canManagePermission ? permissionService.snapshot() : Promise.resolve(null)
      const userRolesTask = this.data.canManagePermission ? permissionService.listUserRoles() : Promise.resolve([])
      const [themes, words, permissionSnapshot, userRoles] = await Promise.all([
        themeTask,
        wordTask,
        permissionSnapshotTask,
        userRolesTask,
      ])

      this.setData({
        themes: Array.isArray(themes) ? themes : [],
        words: Array.isArray(words) ? words : [],
        userRoles: Array.isArray(userRoles) ? userRoles : [],
      })
      this.refreshThemeParentOptions()

      if (permissionSnapshot && typeof permissionSnapshot === 'object') {
        const snapshot = permissionSnapshot as {
          roles: Role[]
          permissions: Permission[]
          role_permissions: Array<{ role_id: number; permission_id: number }>
        }
        const roleNames = snapshot.roles.map((item) => item.name)
        const roleIDs = snapshot.roles.map((item) => item.id)
        const selectedRoleID = this.data.selectedRoleID || roleIDs[0] || 0
        this.setPermissionSnapshot(snapshot, roleNames, roleIDs, selectedRoleID)
      }
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '加载设置失败',
      })
    } finally {
      this.setData({ loading: false })
    }
  },
  setPermissionSnapshot(
    snapshot: { roles: Role[]; permissions: Permission[]; role_permissions: Array<{ role_id: number; permission_id: number }> },
    roleNames: string[],
    roleIDs: number[],
    selectedRoleID: number,
  ) {
    const selectedPermissionIDs = snapshot.role_permissions
      .filter((item) => item.role_id === selectedRoleID)
      .map((item) => item.permission_id)
    const selectedRole = snapshot.roles.find((item) => item.id === selectedRoleID)
    this.setData({
      roles: snapshot.roles,
      roleNames,
      roleIDs,
      selectedRoleID,
      selectedRoleName: selectedRole?.name ?? '',
      permissionOptions: snapshot.permissions
        .filter((item) => visiblePermissionOrder.includes(item.code))
        .map((item) => ({
          ...item,
          name: this.permissionLabel(item.code),
          checked: selectedPermissionIDs.includes(item.id),
        })),
    })
  },
  refreshThemeParentOptions() {
    const targetLevel = Math.max(1, this.data.themeLevel - 1)
    const parentCandidates = this.data.themes.filter((item) => item.level === targetLevel)
    const parentNames = ['无父级', ...parentCandidates.map((item) => item.name)]
    const parentIDs = [0, ...parentCandidates.map((item) => item.id)]
    const themeParentPickerIndex = Math.max(0, parentIDs.indexOf(this.data.themeParentID))
    this.setData({
      themeParentNames: parentNames,
      themeParentIDs: parentIDs,
      themeParentPickerIndex,
    })
  },
  toggleSheet() {
    this.setData({ showSheet: !this.data.showSheet })
  },
  switchPanel(event: WechatMiniprogram.CustomEvent) {
    const panel = String(event.currentTarget.dataset.panel) as SettingsPanel
    this.setData({ activePanel: panel, showSheet: true, error: '' })
  },
  onThemeInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const field = String(event.currentTarget.dataset.field)
    this.setData({ [field]: event.detail.value } as never)
  },
  onThemeLevelChange(event: WechatMiniprogram.CustomEvent) {
    const themeLevel = Number(event.currentTarget.dataset.value)
    this.setData({ themeLevel, themeParentID: 0 }, () => this.refreshThemeParentOptions())
  },
  onThemeParentChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const themeParentPickerIndex = Number(event.detail.value)
    this.setData({
      themeParentPickerIndex,
      themeParentID: this.data.themeParentIDs[themeParentPickerIndex] ?? 0,
    })
  },
  editTheme(event: WechatMiniprogram.CustomEvent) {
    const id = Number(event.currentTarget.dataset.id)
    const theme = this.data.themes.find((item) => item.id === id)
    if (!theme) return
    this.setData({
      activePanel: 'theme',
      themeEditingID: theme.id,
      themeName: theme.name,
      themeLevel: theme.level,
      themeParentID: theme.parent_id ?? 0,
      themeSortOrder: String(theme.sort_order ?? 0),
      showSheet: true,
    })
    this.refreshThemeParentOptions()
  },
  resetThemeForm() {
    this.setData({
      themeEditingID: 0,
      themeName: '',
      themeLevel: 1,
      themeParentID: 0,
      themeSortOrder: '0',
      themeParentPickerIndex: 0,
    })
    this.refreshThemeParentOptions()
  },
  async submitTheme() {
    if (!this.data.canManageTheme) return
    const payload = {
      name: this.data.themeName.trim(),
      level: Number(this.data.themeLevel) || 1,
      parent_id: this.data.themeParentID || undefined,
      sort_order: Number(this.data.themeSortOrder) || 0,
    }
    if (!payload.name) {
      wx.showToast({ title: '请填写主题名称', icon: 'none' })
      return
    }
    try {
      if (this.data.themeEditingID > 0) {
        await themeService.update(this.data.themeEditingID, payload)
      } else {
        await themeService.create(payload)
      }
      this.resetThemeForm()
      await this.loadSettings()
      wx.showToast({ title: '主题已保存', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '保存主题失败' })
    }
  },
  async removeTheme(event: WechatMiniprogram.CustomEvent) {
    const id = Number(event.currentTarget.dataset.id)
    if (!id || !this.data.canManageTheme) return
    try {
      await themeService.remove(id)
      if (this.data.themeEditingID === id) this.resetThemeForm()
      await this.loadSettings()
      wx.showToast({ title: '主题已删除', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '删除主题失败' })
    }
  },
  onWordInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const field = String(event.currentTarget.dataset.field)
    this.setData({ [field]: event.detail.value } as never)
  },
  editWord(event: WechatMiniprogram.CustomEvent) {
    const id = Number(event.currentTarget.dataset.id)
    const word = this.data.words.find((item) => item.id === id)
    if (!word) return
    this.setData({
      activePanel: 'word',
      wordEditingID: word.id,
      wordValue: word.word,
      wordDefinition: word.definition,
      wordL1Category: word.l1_category,
      wordL2Category: word.l2_category,
      wordExample: word.example,
      wordTagsText: word.tags.map((item) => item.category_name).join(', '),
      showSheet: true,
    })
  },
  resetWordForm() {
    this.setData({
      wordEditingID: 0,
      wordValue: '',
      wordDefinition: '',
      wordL1Category: '',
      wordL2Category: '',
      wordExample: '',
      wordTagsText: '',
    })
  },
  async submitWord() {
    if (!this.data.canManageKnowledge) return
    const payload = {
      word: this.data.wordValue.trim(),
      definition: this.data.wordDefinition.trim(),
      l1_category: this.data.wordL1Category.trim(),
      l2_category: this.data.wordL2Category.trim(),
      example: this.data.wordExample.trim(),
      tags: this.data.wordTagsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({ category_id: 0, category_name: item })),
    }
    if (!payload.word || !payload.definition) {
      wx.showToast({ title: '请填写词条和释义', icon: 'none' })
      return
    }
    try {
      if (this.data.wordEditingID > 0) {
        await wordService.update(this.data.wordEditingID, payload)
      } else {
        await wordService.create(payload)
      }
      this.resetWordForm()
      await this.loadSettings()
      wx.showToast({ title: '词条已保存', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '保存词条失败' })
    }
  },
  async removeWord(event: WechatMiniprogram.CustomEvent) {
    const id = Number(event.currentTarget.dataset.id)
    if (!id || !this.data.canManageKnowledge) return
    try {
      await wordService.remove(id)
      if (this.data.wordEditingID === id) this.resetWordForm()
      await this.loadSettings()
      wx.showToast({ title: '词条已删除', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '删除词条失败' })
    }
  },
  onRoleChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const selectedIndex = Number(event.detail.value)
    const selectedRoleID = this.data.roleIDs[selectedIndex] ?? 0
    const selectedRole = this.data.roles.find((item) => item.id === selectedRoleID)
    this.setData({
      selectedRoleID,
      selectedRoleName: selectedRole?.name ?? '',
    })
    void this.reloadPermissionSnapshot(selectedRoleID)
  },
  async reloadPermissionSnapshot(selectedRoleID?: number) {
    if (!this.data.canManagePermission) return
    try {
      const snapshot = await permissionService.snapshot()
      const roleNames = snapshot.roles.map((item) => item.name)
      const roleIDs = snapshot.roles.map((item) => item.id)
      this.setPermissionSnapshot(snapshot, roleNames, roleIDs, selectedRoleID ?? this.data.selectedRoleID)
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '刷新权限失败' })
    }
  },
  onPermissionToggle(event: WechatMiniprogram.CustomEvent) {
    const permissionID = Number(event.currentTarget.dataset.id)
    this.setData({
      permissionOptions: this.data.permissionOptions.map((item) =>
        item.id === permissionID ? { ...item, checked: !item.checked } : item,
      ),
    })
  },
  async saveRolePermissions() {
    if (!this.data.canManagePermission || !this.data.selectedRoleID) return
    const permissionIDs = this.data.permissionOptions.filter((item) => item.checked).map((item) => item.id)
    try {
      await permissionService.updateRolePermissions(this.data.selectedRoleID, permissionIDs)
      await this.reloadPermissionSnapshot(this.data.selectedRoleID)
      wx.showToast({ title: '角色权限已保存', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '保存角色权限失败' })
    }
  },
  async onUserRoleChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const userID = Number(event.currentTarget.dataset.id)
    const selectedIndex = Number(event.detail.value)
    const roleID = this.data.roleIDs[selectedIndex] ?? 0
    if (!userID || !roleID || !this.data.canManagePermission) return
    try {
      await permissionService.updateUserRole(userID, roleID)
      await this.loadSettings()
      wx.showToast({ title: '用户角色已更新', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '更新用户角色失败' })
    }
  },
  onLogout() {
    clearSession()
    wx.reLaunch({ url: '/pages/login/index' })
  },
})
