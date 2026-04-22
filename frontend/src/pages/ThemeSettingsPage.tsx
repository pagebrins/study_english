import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useThemes } from '../hooks/useThemes'
import { permissionApi } from '../services/permission'
import type { Permission, Role, UserRoleView } from '../types/permission'
import type { Theme } from '../types/theme'

type ThemeForm = {
  name: string
  level: number
  parent_id?: number
  sort_order: string
}

const initialForm: ThemeForm = {
  name: '',
  level: 1,
  parent_id: undefined,
  sort_order: '0',
}

type Props = {
  onClose?: () => void
}

export const ThemeSettingsPage = ({ onClose }: Props) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { allItems, error, fetchAll, create, update, remove } = useThemes()
  const [editingID, setEditingID] = useState<number>(0)
  const [formError, setFormError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<ThemeForm>(initialForm)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissionMap, setRolePermissionMap] = useState<Record<number, Set<number>>>({})
  const [userRoles, setUserRoles] = useState<UserRoleView[]>([])
  const [permissionError, setPermissionError] = useState('')
  const [permissionPending, setPermissionPending] = useState(false)

  const tab = searchParams.get('tab') === 'permission' ? 'permission' : 'theme'

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

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

  const level1Options = level1
  const level2Options = useMemo(() => {
    if (form.level !== 3) return level2
    return level2
  }, [form.level, level2])

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

  const submit = async () => {
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
    setForm(initialForm)
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
                <Button size="sm" variant="ghost" onClick={() => openEdit(child)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => void remove(child.id)}>Delete</Button>
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

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-52 border-r border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-2">
          <button
            type="button"
            className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${tab === 'theme' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-900'}`}
            onClick={() => setSearchParams({ tab: 'theme' })}
          >
            主题
          </button>
          <button
            type="button"
            className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${tab === 'permission' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-900'}`}
            onClick={() => setSearchParams({ tab: 'permission' })}
          >
            权限
          </button>
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'theme' ? (
          <>
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold">主题管理</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openCreate(1)}>Create Level 1</Button>
                {onClose ? (
                  <Button variant="ghost" onClick={onClose}>Close</Button>
                ) : null}
              </div>
            </div>
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
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => void remove(item.id)}>Delete</Button>
                    </div>
                  </Card>
                  {renderChildren(item, level2)}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold">权限管理</h2>
              {onClose ? <Button variant="ghost" onClick={onClose}>Close</Button> : null}
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {permissionError && <p className="text-sm text-red-400">{permissionError}</p>}
              <Card className="space-y-3">
                <h3 className="text-base font-semibold">角色权限矩阵</h3>
                {roles.map((role) => (
                  <div key={role.id} className="rounded border border-zinc-800 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-medium">{role.name} ({role.code})</p>
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
          </>
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
                    {(form.level === 2 ? level1Options : level2Options).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
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
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={() => void submit()}>{editingID ? 'Update' : 'Create'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
