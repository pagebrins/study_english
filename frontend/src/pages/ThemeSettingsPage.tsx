import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useAuth } from '../hooks/useAuth'
import { useThemes } from '../hooks/useThemes'
import { useWords } from '../hooks/useWords'
import { permissionApi } from '../services/permission'
import type { Permission, Role, UserRoleView } from '../types/permission'
import type { Theme } from '../types/theme'
import type { Word, WordPayload, WordTagPayload } from '../types/word'
import { hasPermission } from '../utils/permission'

type ThemeForm = {
  name: string
  level: number
  parent_id?: number
  sort_order: string
}

type WordTagForm = {
  category_id: string
  category_name: string
}

type WordForm = {
  word: string
  definition: string
  l1_category: string
  l2_category: string
  example: string
  tags: WordTagForm[]
}

const initialThemeForm: ThemeForm = {
  name: '',
  level: 1,
  parent_id: undefined,
  sort_order: '0',
}

const initialWordForm: WordForm = {
  word: '',
  definition: '',
  l1_category: '',
  l2_category: '',
  example: '',
  tags: [{ category_id: '1', category_name: '' }],
}

type Props = {
  onClose?: () => void
}

const getWordPayload = (form: WordForm): WordPayload => ({
  word: form.word.trim(),
  definition: form.definition.trim(),
  l1_category: form.l1_category.trim(),
  l2_category: form.l2_category.trim(),
  example: form.example.trim(),
  tags: form.tags.reduce<WordTagPayload[]>((result, tag, index) => {
    const categoryName = tag.category_name.trim()
    if (!categoryName) return result
    const categoryID = Number(tag.category_id)
    result.push({
      category_id: Number.isInteger(categoryID) && categoryID > 0 ? categoryID : index + 1,
      category_name: categoryName,
    })
    return result
  }, []),
})

export const ThemeSettingsPage = ({ onClose }: Props) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { allItems, error, fetchAll, create, update, remove } = useThemes()
  const {
    items: words,
    error: wordError,
    loading: wordLoading,
    fetchAll: fetchWords,
    create: createWord,
    update: updateWord,
    remove: removeWord,
  } = useWords()
  const [editingID, setEditingID] = useState<number>(0)
  const [formError, setFormError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<ThemeForm>(initialThemeForm)
  const [wordEditingID, setWordEditingID] = useState<number>(0)
  const [wordFormError, setWordFormError] = useState('')
  const [isWordModalOpen, setIsWordModalOpen] = useState(false)
  const [wordForm, setWordForm] = useState<WordForm>(initialWordForm)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissionMap, setRolePermissionMap] = useState<Record<number, Set<number>>>({})
  const [userRoles, setUserRoles] = useState<UserRoleView[]>([])
  const [permissionError, setPermissionError] = useState('')
  const [permissionPending, setPermissionPending] = useState(false)
  const canManageTheme = hasPermission(user, 'settings.theme.manage')
  const canManageKnowledge = hasPermission(user, 'settings.knowledge.manage')
  const canManagePermission = hasPermission(user, 'settings.permission.manage')

  const tabParam = searchParams.get('tab')
  const defaultTab = canManageKnowledge ? 'knowledge' : canManagePermission ? 'permission' : 'theme'
  const requestedTab = tabParam === 'permission' || tabParam === 'knowledge' ? tabParam : 'theme'
  const tab =
    (requestedTab === 'theme' && canManageTheme) ||
    (requestedTab === 'knowledge' && canManageKnowledge) ||
    (requestedTab === 'permission' && canManagePermission)
      ? requestedTab
      : defaultTab

  useEffect(() => {
    if (tab !== requestedTab) {
      setSearchParams({ tab })
    }
  }, [requestedTab, setSearchParams, tab])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (tab !== 'knowledge') return
    void fetchWords()
  }, [fetchWords, tab])

  useEffect(() => {
    const loadPermissionData = async () => {
      if (tab !== 'permission') return
      setPermissionPending(true)
      setPermissionError('')
      try {
        const snapshot = await permissionApi.snapshot()
        const roleMap: Record<number, Set<number>> = {}
        snapshot.roles.forEach((role) => {
          roleMap[role.id] = new Set(
            snapshot.role_permissions
              .filter((item) => item.role_id === role.id)
              .map((item) => item.permission_id),
          )
        })
        setRoles(snapshot.roles)
        setPermissions(snapshot.permissions)
        setRolePermissionMap(roleMap)
        setUserRoles(await permissionApi.listUserRoles())
      } catch (err) {
        setPermissionError((err as Error).message)
      } finally {
        setPermissionPending(false)
      }
    }
    void loadPermissionData()
  }, [tab])

  const level1 = useMemo(() => allItems.filter((item) => item.level === 1), [allItems])
  const level2 = useMemo(() => allItems.filter((item) => item.level === 2), [allItems])
  const level3 = useMemo(() => allItems.filter((item) => item.level === 3), [allItems])
  const roleByID = useMemo(() => {
    const map = new Map<number, Role>()
    roles.forEach((role) => map.set(role.id, role))
    return map
  }, [roles])
  const knowledgeSummary = useMemo(() => {
    const l1Categories = new Set(words.map((item) => item.l1_category).filter(Boolean))
    const tags = new Set(words.flatMap((item) => item.tags.map((tag) => tag.category_name).filter(Boolean)))
    return {
      wordCount: words.length,
      categoryCount: l1Categories.size,
      tagCount: tags.size,
    }
  }, [words])

  const openCreate = (level: number, parentID?: number) => {
    setEditingID(0)
    setFormError('')
    setForm({
      name: '',
      level,
      parent_id: level === 1 ? undefined : parentID,
      sort_order: '0',
    })
    setIsModalOpen(true)
  }

  const openEdit = (theme: Theme) => {
    setEditingID(theme.id)
    setFormError('')
    setForm({
      name: theme.name,
      level: theme.level,
      parent_id: theme.parent_id,
      sort_order: String(theme.sort_order ?? 0),
    })
    setIsModalOpen(true)
  }

  const submitTheme = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (form.level > 1 && !form.parent_id) {
      setFormError('Parent theme is required for level 2/3.')
      return
    }
    const sortOrder = Number(form.sort_order || '0')
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setFormError('Sort order must be an integer >= 0.')
      return
    }
    setFormError('')
    const payload = {
      name: form.name.trim(),
      level: form.level,
      parent_id: form.level === 1 ? undefined : form.parent_id,
      sort_order: sortOrder,
    }
    if (editingID > 0) {
      await update(editingID, payload)
    } else {
      await create(payload)
    }
    setIsModalOpen(false)
    setEditingID(0)
    setForm(initialThemeForm)
  }

  const renderChildren = (parent: Theme, children: Theme[]) => (
    <div className="space-y-2 pl-6">
      {children
        .filter((item) => item.parent_id === parent.id)
        .map((child) => (
          <div key={child.id} className="space-y-2">
            <Card className="flex items-center justify-between border-zinc-700 bg-zinc-900/40 p-3">
              <p className="text-sm text-zinc-200">L{child.level} · {child.name}</p>
              <div className="flex gap-2">
                {child.level < 3 && (
                  <Button size="sm" variant="outline" onClick={() => openCreate(child.level + 1, child.id)}>
                    Add Child
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(child)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => void remove(child.id)}>
                  Delete
                </Button>
              </div>
            </Card>
            {child.level < 3 && renderChildren(child, level3)}
          </div>
        ))}
    </div>
  )

  const togglePermission = (roleID: number, permissionID: number) => {
    setRolePermissionMap((prev) => {
      const nextSet = new Set(prev[roleID] ?? [])
      if (nextSet.has(permissionID)) {
        nextSet.delete(permissionID)
      } else {
        nextSet.add(permissionID)
      }
      return { ...prev, [roleID]: nextSet }
    })
  }

  const saveRolePermissions = async (roleID: number) => {
    setPermissionPending(true)
    setPermissionError('')
    try {
      await permissionApi.updateRolePermissions(roleID, Array.from(rolePermissionMap[roleID] ?? []))
    } catch (err) {
      setPermissionError((err as Error).message)
    } finally {
      setPermissionPending(false)
    }
  }

  const updateUserRole = async (userID: number, roleID: number) => {
    setPermissionPending(true)
    setPermissionError('')
    try {
      await permissionApi.updateUserRole(userID, roleID)
      setUserRoles((prev) =>
        prev.map((item) => {
          if (item.user_id !== userID) return item
          const role = roleByID.get(roleID)
          return {
            ...item,
            role_id: roleID,
            role_code: role?.code ?? item.role_code,
            role_name: role?.name ?? item.role_name,
          }
        }),
      )
    } catch (err) {
      setPermissionError((err as Error).message)
    } finally {
      setPermissionPending(false)
    }
  }

  const openCreateWord = () => {
    setWordEditingID(0)
    setWordFormError('')
    setWordForm(initialWordForm)
    setIsWordModalOpen(true)
  }

  const openEditWord = (word: Word) => {
    setWordEditingID(word.id)
    setWordFormError('')
    setWordForm({
      word: word.word,
      definition: word.definition,
      l1_category: word.l1_category,
      l2_category: word.l2_category,
      example: word.example,
      tags:
        word.tags.length > 0
          ? word.tags.map((tag) => ({
              category_id: String(tag.category_id),
              category_name: tag.category_name,
            }))
          : [{ category_id: '1', category_name: '' }],
    })
    setIsWordModalOpen(true)
  }

  const updateTagRow = (index: number, key: keyof WordTagForm, value: string) => {
    setWordForm((prev) => ({
      ...prev,
      tags: prev.tags.map((tag, tagIndex) => (tagIndex === index ? { ...tag, [key]: value } : tag)),
    }))
  }

  const addTagRow = () => {
    setWordForm((prev) => ({
      ...prev,
      tags: [...prev.tags, { category_id: String(prev.tags.length + 1), category_name: '' }],
    }))
  }

  const removeTagRow = (index: number) => {
    setWordForm((prev) => {
      const nextTags = prev.tags.filter((_, tagIndex) => tagIndex !== index)
      return {
        ...prev,
        tags: nextTags.length > 0 ? nextTags : [{ category_id: '1', category_name: '' }],
      }
    })
  }

  const submitWord = async () => {
    if (!wordForm.word.trim()) {
      setWordFormError('Word is required.')
      return
    }
    if (!wordForm.definition.trim()) {
      setWordFormError('Definition is required.')
      return
    }
    if (!wordForm.l1_category.trim()) {
      setWordFormError('一级分类不能为空。')
      return
    }
    setWordFormError('')
    const payload = getWordPayload(wordForm)
    if (wordEditingID > 0) {
      await updateWord(wordEditingID, payload)
    } else {
      await createWord(payload)
    }
    setIsWordModalOpen(false)
    setWordEditingID(0)
    setWordForm(initialWordForm)
  }

  const headerTitle =
    tab === 'theme' ? '主题管理' : tab === 'knowledge' ? '知识库管理' : '权限管理'

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-52 border-r border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-2">
          {canManageTheme && (
            <button
              type="button"
              className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${tab === 'theme' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-900'}`}
              onClick={() => setSearchParams({ tab: 'theme' })}
            >
              主题
            </button>
          )}
          {canManageKnowledge && (
            <button
              type="button"
              className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${tab === 'knowledge' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-900'}`}
              onClick={() => setSearchParams({ tab: 'knowledge' })}
            >
              知识库
            </button>
          )}
          {canManagePermission && (
            <button
              type="button"
              className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${tab === 'permission' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-900'}`}
              onClick={() => setSearchParams({ tab: 'permission' })}
            >
              权限
            </button>
          )}
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold">{headerTitle}</h2>
          <div className="flex gap-2">
            {tab === 'theme' && (
              <Button variant="outline" onClick={() => openCreate(1)}>
                Create Level 1
              </Button>
            )}
            {tab === 'knowledge' && (
              <Button variant="outline" onClick={openCreateWord}>
                新增单词
              </Button>
            )}
            {onClose ? (
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            ) : null}
          </div>
        </div>

        {tab === 'theme' && (
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {error && <p className="text-sm text-red-400">{error}</p>}
            {level1.map((item) => (
              <div key={item.id} className="space-y-2">
                <Card className="flex items-center justify-between border-zinc-700 p-3">
                  <p className="text-sm font-medium">L{item.level} · {item.name}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openCreate(2, item.id)}>
                      Add Child
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void remove(item.id)}>
                      Delete
                    </Button>
                  </div>
                </Card>
                {renderChildren(item, level2)}
              </div>
            ))}
          </div>
        )}

        {tab === 'knowledge' && (
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="space-y-1">
                <p className="text-sm text-zinc-400">单词数</p>
                <p className="text-2xl font-semibold">{knowledgeSummary.wordCount}</p>
              </Card>
              <Card className="space-y-1">
                <p className="text-sm text-zinc-400">一级分类数</p>
                <p className="text-2xl font-semibold">{knowledgeSummary.categoryCount}</p>
              </Card>
              <Card className="space-y-1">
                <p className="text-sm text-zinc-400">标签数</p>
                <p className="text-2xl font-semibold">{knowledgeSummary.tagCount}</p>
              </Card>
            </div>
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-800 text-sm">
                  <thead className="bg-zinc-950/80">
                    <tr className="text-left text-zinc-400">
                      <th className="px-4 py-3 font-medium">单词</th>
                      <th className="px-4 py-3 font-medium">释义</th>
                      <th className="px-4 py-3 font-medium">分类</th>
                      <th className="px-4 py-3 font-medium">标签</th>
                      <th className="px-4 py-3 font-medium">例句</th>
                      <th className="px-4 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {wordLoading && (
                      <tr>
                        <td className="px-4 py-6 text-zinc-400" colSpan={6}>
                          正在加载知识库...
                        </td>
                      </tr>
                    )}
                    {!wordLoading && wordError && (
                      <tr>
                        <td className="px-4 py-6 text-red-400" colSpan={6}>
                          {wordError}
                        </td>
                      </tr>
                    )}
                    {!wordLoading && !wordError && words.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-zinc-400" colSpan={6}>
                          还没有单词数据，先新增一个单词吧。
                        </td>
                      </tr>
                    )}
                    {!wordLoading &&
                      !wordError &&
                      words.map((item) => (
                        <tr key={item.id} className="align-top">
                          <td className="px-4 py-4 font-semibold text-zinc-100">{item.word}</td>
                          <td className="px-4 py-4 text-zinc-300">{item.definition}</td>
                          <td className="px-4 py-4 text-zinc-400">
                            <div>{item.l1_category}</div>
                            {item.l2_category && <div className="text-xs text-zinc-500">{item.l2_category}</div>}
                          </td>
                          <td className="px-4 py-4 text-zinc-300">
                            <div className="flex flex-wrap gap-2">
                              {item.tags.length > 0 ? (
                                item.tags.map((tag) => (
                                  <span key={tag.id} className="rounded-full border border-zinc-700 px-2 py-1 text-xs">
                                    {tag.category_name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-zinc-500">无标签</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-zinc-300">{item.example || <span className="text-zinc-500">暂无例句</span>}</td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => openEditWord(item)}>
                                编辑
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => void removeWord(item.id)}>
                                删除
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {tab === 'permission' && (
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {permissionError && <p className="text-sm text-red-400">{permissionError}</p>}
            <Card className="space-y-3">
              <h3 className="text-base font-semibold">角色权限矩阵</h3>
              {roles.map((role) => (
                <div key={role.id} className="rounded border border-zinc-800 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-medium">
                      {role.name} ({role.code})
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void saveRolePermissions(role.id)}
                      disabled={permissionPending}
                    >
                      Save
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {permissions.map((permission) => (
                      <label key={`${role.id}-${permission.id}`} className="flex items-center gap-2 text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          checked={rolePermissionMap[role.id]?.has(permission.id) ?? false}
                          onChange={() => togglePermission(role.id, permission.id)}
                        />
                        <span>{permission.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
            <Card className="space-y-3">
              <h3 className="text-base font-semibold">用户角色分配</h3>
              {permissionPending && <p className="text-sm text-zinc-400">Loading...</p>}
              {userRoles.map((userRole) => (
                <div key={userRole.user_id} className="flex items-center justify-between gap-4 rounded border border-zinc-800 p-3">
                  <div>
                    <p className="font-medium">{userRole.name}</p>
                    <p className="text-xs text-zinc-500">{userRole.email}</p>
                  </div>
                  <select
                    className="h-9 min-w-40 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
                    value={userRole.role_id}
                    onChange={(event) => {
                      const roleID = Number(event.target.value)
                      if (roleID > 0) void updateUserRole(userRole.user_id, roleID)
                    }}
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} ({role.code})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {isModalOpen && tab === 'theme' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
          <Card className="w-full max-w-xl space-y-4">
            <h3 className="text-lg font-semibold">{editingID ? 'Edit Theme' : 'Create Theme'}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="w-28 shrink-0 text-sm text-zinc-300">Name:</p>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <p className="w-28 shrink-0 text-sm text-zinc-300">Level:</p>
                <select
                  className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
                  value={form.level}
                  onChange={(event) => {
                    const level = Number(event.target.value)
                    setForm((prev) => ({ ...prev, level, parent_id: level === 1 ? undefined : prev.parent_id }))
                  }}
                >
                  <option value={1}>Level 1</option>
                  <option value={2}>Level 2</option>
                  <option value={3}>Level 3</option>
                </select>
              </div>
              {form.level > 1 && (
                <div className="flex items-center gap-3">
                  <p className="w-28 shrink-0 text-sm text-zinc-300">Parent:</p>
                  <select
                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
                    value={form.parent_id ?? 0}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setForm((prev) => ({ ...prev, parent_id: value > 0 ? value : undefined }))
                    }}
                  >
                    <option value={0}>Select parent</option>
                    {(form.level === 2 ? level1 : level2).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-3">
                <p className="w-28 shrink-0 text-sm text-zinc-300">Sort:</p>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-400">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submitTheme()}>{editingID ? 'Update' : 'Create'}</Button>
            </div>
          </Card>
        </div>
      )}

      {isWordModalOpen && tab === 'knowledge' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-8">
          <Card className="max-h-full w-full max-w-3xl space-y-4 overflow-y-auto">
            <h3 className="text-lg font-semibold">{wordEditingID ? '编辑单词' : '新增单词'}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm text-zinc-300">单词</span>
                <Input value={wordForm.word} onChange={(event) => setWordForm((prev) => ({ ...prev, word: event.target.value }))} />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-zinc-300">释义</span>
                <Input
                  value={wordForm.definition}
                  onChange={(event) => setWordForm((prev) => ({ ...prev, definition: event.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-zinc-300">一级分类</span>
                <Input
                  value={wordForm.l1_category}
                  onChange={(event) => setWordForm((prev) => ({ ...prev, l1_category: event.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-zinc-300">二级分类</span>
                <Input
                  value={wordForm.l2_category}
                  onChange={(event) => setWordForm((prev) => ({ ...prev, l2_category: event.target.value }))}
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">例句</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600"
                value={wordForm.example}
                onChange={(event) => setWordForm((prev) => ({ ...prev, example: event.target.value }))}
              />
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-200">标签</p>
                <Button size="sm" variant="outline" onClick={addTagRow}>
                  Add Tag
                </Button>
              </div>
              <div className="space-y-2">
                {wordForm.tags.map((tag, index) => (
                  <div key={`tag-${index}`} className="grid gap-2 md:grid-cols-[140px_1fr_96px]">
                    <Input
                      type="number"
                      placeholder="category_id"
                      value={tag.category_id}
                      onChange={(event) => updateTagRow(index, 'category_id', event.target.value)}
                    />
                    <Input
                      placeholder="category_name"
                      value={tag.category_name}
                      onChange={(event) => updateTagRow(index, 'category_name', event.target.value)}
                    />
                    <Button variant="ghost" onClick={() => removeTagRow(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            {wordFormError && <p className="text-sm text-red-400">{wordFormError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsWordModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submitWord()}>{wordEditingID ? 'Update' : 'Create'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
