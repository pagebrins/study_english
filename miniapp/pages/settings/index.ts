import { modeService } from '../../services/mode'
import { permissionService } from '../../services/permission'
import { themeService } from '../../services/theme'
import { wordService } from '../../services/word'
import { requireLogin } from '../../utils/guard'
import { hasPermission, isAdmin } from '../../utils/permission'
import { getStorageUser } from '../../utils/session'
import type { StudyMode } from '../../types/mode'
import type { Permission, Role, UserRoleView } from '../../types/permission'
import type { Theme } from '../../types/theme'
import type { Word } from '../../types/word'

type SettingsTab = 'mode' | 'theme' | 'word' | 'permission'

type PermissionOption = Permission & {
  checked: boolean
}

type SettingsData = {
  loading: boolean
  error: string
  activeTab: SettingsTab
  canManageTheme: boolean
  canManageKnowledge: boolean
  canManagePermission: boolean
  canManageMode: boolean
  userName: string
  modes: StudyMode[]
  themes: Theme[]
  words: Word[]
  roles: Role[]
  roleNames: string[]
  roleIDs: number[]
  selectedRoleID: number
  selectedRoleName: string
  permissionOptions: PermissionOption[]
  userRoles: UserRoleView[]
  modeEditingID: number
  modeName: string
  modeDescription: string
  modeLevel: number
  modeNumbers: number
  modeType: number
  modeTranslationMode: number
  modeRequirementsText: string
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

const emptySettingsState = {
  modeEditingID: 0,
  modeName: '',
  modeDescription: '',
  modeLevel: 3,
  modeNumbers: 5,
  modeType: 2,
  modeTranslationMode: 1,
  modeRequirementsText: '',
  themeEditingID: 0,
  themeName: '',
  themeLevel: 1,
  themeParentID: 0,
  themeSortOrder: '0',
  themeParentPickerIndex: 0,
  wordEditingID: 0,
  wordValue: '',
  wordDefinition: '',
  wordL1Category: '',
  wordL2Category: '',
  wordExample: '',
  wordTagsText: '',
}

Page<SettingsData>({
  data: {
    loading: false,
    error: '',
    activeTab: 'mode',
    canManageTheme: false,
    canManageKnowledge: false,
    canManagePermission: false,
    canManageMode: false,
    userName: getStorageUser()?.name ?? '同学',
    modes: [],
    themes: [],
    words: [],
    roles: [],
    roleNames: [],
    roleIDs: [],
    selectedRoleID: 0,
    selectedRoleName: '',
    permissionOptions: [],
    userRoles: [],
    themeParentNames: ['无父级'],
    themeParentIDs: [0],
    ...emptySettingsState,
  },
  onShow() {
    if (!requireLogin()) return
    const user = getStorageUser()
    const canManageTheme = hasPermission(user, 'settings.theme.manage')
    const canManageKnowledge = hasPermission(user, 'settings.knowledge.manage')
    const canManagePermission = hasPermission(user, 'settings.permission.manage')
    const canManageMode = isAdmin(user)
    const activeTab = canManageMode
      ? 'mode'
      : canManageTheme
        ? 'theme'
        : canManageKnowledge
          ? 'word'
          : canManagePermission
            ? 'permission'
            : 'mode'

    this.setData({
      userName: user?.name ?? '同学',
      canManageTheme,
      canManageKnowledge,
      canManagePermission,
      canManageMode,
      activeTab,
    })
    void this.loadSettings()
  },
  async loadSettings() {
    this.setData({ loading: true, error: '' })
    try {
      const user = getStorageUser()
      const shouldLoadTheme = hasPermission(user, 'settings.theme.manage')
      const shouldLoadKnowledge = hasPermission(user, 'settings.knowledge.manage')
      const shouldLoadPermission = hasPermission(user, 'settings.permission.manage')
      const shouldLoadMode = isAdmin(user)

      const modeTask = shouldLoadMode ? modeService.list() : Promise.resolve([])
      const themeTask = shouldLoadTheme ? themeService.list({ all: true }) : Promise.resolve([])
      const wordTask = shouldLoadKnowledge ? wordService.list() : Promise.resolve([])
      const permissionSnapshotTask = shouldLoadPermission ? permissionService.snapshot() : Promise.resolve(null)
      const userRolesTask = shouldLoadPermission ? permissionService.listUserRoles() : Promise.resolve([])

      const [modes, themes, words, permissionSnapshot, userRoles] = await Promise.all([
        modeTask,
        themeTask,
        wordTask,
        permissionSnapshotTask,
        userRolesTask,
      ])

      const safeModes = Array.isArray(modes)
        ? (modes as StudyMode[]).filter((item) => item.source === 'manual')
        : []
      const safeThemes = Array.isArray(themes) ? (themes as Theme[]) : []
      const safeWords = Array.isArray(words) ? (words as Word[]) : []
      const safeUserRoles = Array.isArray(userRoles) ? (userRoles as UserRoleView[]) : []

      this.setData({
        modes: safeModes,
        themes: safeThemes,
        words: safeWords,
        userRoles: safeUserRoles,
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
          permissionOptions: snapshot.permissions.map((item) => ({
            ...item,
            checked: selectedPermissionIDs.includes(item.id),
          })),
        })
      }
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '加载设置失败',
      })
    } finally {
      this.setData({ loading: false })
    }
  },
  refreshThemeParentOptions() {
    const parentCandidates = this.data.themes.filter((item) => item.level === Math.max(1, this.data.themeLevel - 1))
    const parentNames = ['无父级', ...parentCandidates.map((item) => item.name)]
    const parentIDs = [0, ...parentCandidates.map((item) => item.id)]
    const parentPickerIndex = Math.max(0, parentIDs.indexOf(this.data.themeParentID))
    this.setData({
      themeParentNames: parentNames,
      themeParentIDs: parentIDs,
      themeParentPickerIndex,
    })
  },
  switchTab(event: WechatMiniprogram.CustomEvent) {
    const tab = String(event.currentTarget.dataset.tab) as SettingsTab
    this.setData({ activeTab: tab, error: '' })
  },
  onModeInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const field = String(event.currentTarget.dataset.field)
    this.setData({ [field]: event.detail.value } as any)
  },
  onModeTypeChange(event: WechatMiniprogram.CustomEvent) {
    const modeType = Number(event.currentTarget.dataset.value)
    this.setData({ modeType })
  },
  onModeTranslationChange(event: WechatMiniprogram.CustomEvent) {
    const modeTranslationMode = Number(event.currentTarget.dataset.value)
    this.setData({ modeTranslationMode })
  },
  editMode(event: WechatMiniprogram.CustomEvent) {
    const modeID = Number(event.currentTarget.dataset.id)
    const mode = this.data.modes.find((item) => item.id === modeID)
    if (!mode) return
    this.setData({
      modeEditingID: mode.id,
      modeName: mode.name,
      modeDescription: mode.description,
      modeLevel: mode.level,
      modeNumbers: mode.numbers,
      modeType: mode.type,
      modeTranslationMode: mode.mode,
      modeRequirementsText: mode.requirements.join('\n'),
      activeTab: 'mode',
    })
  },
  resetModeForm() {
    this.setData({
      modeEditingID: 0,
      modeName: '',
      modeDescription: '',
      modeLevel: 3,
      modeNumbers: 5,
      modeType: 2,
      modeTranslationMode: 1,
      modeRequirementsText: '',
    })
  },
  async submitMode() {
    try {
      const payload = {
        name: this.data.modeName.trim(),
        description: this.data.modeDescription.trim(),
        level: Number(this.data.modeLevel) || 1,
        numbers: Number(this.data.modeNumbers) || 1,
        type: Number(this.data.modeType) || 2,
        mode: Number(this.data.modeTranslationMode) || 1,
        requirements: this.data.modeRequirementsText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      }
      if (!payload.name) {
        wx.showToast({ title: '请填写模式名称', icon: 'none' })
        return
      }
      if (this.data.modeEditingID > 0) {
        await modeService.update(this.data.modeEditingID, payload)
      } else {
        await modeService.create(payload)
      }
      this.resetModeForm()
      await this.loadSettings()
      wx.showToast({ title: '模式已保存', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '保存模式失败' })
    }
  },
  async removeMode(event: WechatMiniprogram.CustomEvent) {
    const modeID = Number(event.currentTarget.dataset.id)
    if (!modeID) return
    try {
      await modeService.remove(modeID)
      await this.loadSettings()
      wx.showToast({ title: '模式已删除', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '删除模式失败' })
    }
  },
  onThemeInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const field = String(event.currentTarget.dataset.field)
    this.setData({ [field]: event.detail.value } as any)
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
    const themeID = Number(event.currentTarget.dataset.id)
    const theme = this.data.themes.find((item) => item.id === themeID)
    if (!theme) return
    this.setData({
      themeEditingID: theme.id,
      themeName: theme.name,
      themeLevel: theme.level,
      themeParentID: theme.parent_id ?? 0,
      themeSortOrder: String(theme.sort_order ?? 0),
      activeTab: 'theme',
    }, () => this.refreshThemeParentOptions())
  },
  resetThemeForm() {
    this.setData({
      themeEditingID: 0,
      themeName: '',
      themeLevel: 1,
      themeParentID: 0,
      themeSortOrder: '0',
      themeParentPickerIndex: 0,
    }, () => this.refreshThemeParentOptions())
  },
  async submitTheme() {
    try {
      const payload = {
        name: this.data.themeName.trim(),
        level: Number(this.data.themeLevel) || 1,
        parent_id: this.data.themeLevel === 1 || !this.data.themeParentID ? undefined : this.data.themeParentID,
        sort_order: Number(this.data.themeSortOrder) || 0,
      }
      if (!payload.name) {
        wx.showToast({ title: '请填写主题名称', icon: 'none' })
        return
      }
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
    const themeID = Number(event.currentTarget.dataset.id)
    if (!themeID) return
    try {
      await themeService.remove(themeID)
      await this.loadSettings()
      wx.showToast({ title: '主题已删除', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '删除主题失败' })
    }
  },
  onWordInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const field = String(event.currentTarget.dataset.field)
    this.setData({ [field]: event.detail.value } as any)
  },
  editWord(event: WechatMiniprogram.CustomEvent) {
    const wordID = Number(event.currentTarget.dataset.id)
    const word = this.data.words.find((item) => item.id === wordID)
    if (!word) return
    this.setData({
      wordEditingID: word.id,
      wordValue: word.word,
      wordDefinition: word.definition,
      wordL1Category: word.l1_category,
      wordL2Category: word.l2_category,
      wordExample: word.example,
      wordTagsText: word.tags.map((tag) => tag.category_name).join(', '),
      activeTab: 'word',
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
    try {
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
          .map((item, index) => ({
            category_id: index + 1,
            category_name: item,
          })),
      }
      if (!payload.word || !payload.definition || !payload.l1_category) {
        wx.showToast({ title: '请补全单词信息', icon: 'none' })
        return
      }
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
    const wordID = Number(event.currentTarget.dataset.id)
    if (!wordID) return
    try {
      await wordService.remove(wordID)
      await this.loadSettings()
      wx.showToast({ title: '词条已删除', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '删除词条失败' })
    }
  },
  onRoleChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const selectedIndex = Number(event.detail.value)
    const selectedRoleID = this.data.roleIDs[selectedIndex] ?? 0
    if (!selectedRoleID) return
    void this.loadRolePermissions(selectedRoleID)
  },
  async loadRolePermissions(selectedRoleID: number) {
    try {
      const snapshot = await permissionService.snapshot()
      const selectedPermissionIDs = snapshot.role_permissions
        .filter((item) => item.role_id === selectedRoleID)
        .map((item) => item.permission_id)
      this.setData({
        roles: snapshot.roles,
        roleNames: snapshot.roles.map((item) => item.name),
        roleIDs: snapshot.roles.map((item) => item.id),
        selectedRoleID,
        selectedRoleName: snapshot.roles.find((item) => item.id === selectedRoleID)?.name ?? '',
        permissionOptions: snapshot.permissions.map((item) => ({
          ...item,
          checked: selectedPermissionIDs.includes(item.id),
        })),
      })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '加载角色权限失败' })
    }
  },
  onPermissionToggle(event: WechatMiniprogram.CustomEvent) {
    const permissionID = Number(event.currentTarget.dataset.id)
    const permissionOptions = this.data.permissionOptions.map((item) =>
      item.id === permissionID ? { ...item, checked: !item.checked } : item,
    )
    this.setData({ permissionOptions })
  },
  async saveRolePermissions() {
    try {
      await permissionService.updateRolePermissions(
        this.data.selectedRoleID,
        this.data.permissionOptions.filter((item) => item.checked).map((item) => item.id),
      )
      wx.showToast({ title: '权限已保存', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '保存权限失败' })
    }
  },
  async onUserRoleChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const userID = Number(event.currentTarget.dataset.id)
    const selectedIndex = Number(event.detail.value)
    const roleID = this.data.roleIDs[selectedIndex] ?? 0
    try {
      await permissionService.updateUserRole(userID, roleID)
      await this.loadSettings()
      wx.showToast({ title: '用户角色已更新', icon: 'success' })
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '更新用户角色失败' })
    }
  },
})
