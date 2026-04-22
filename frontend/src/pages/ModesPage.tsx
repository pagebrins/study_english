import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { categoryLabel, translationModeLabel } from '../constants/study'
import { useModes } from '../hooks/useModes'
import { useStudyCategory } from '../hooks/useStudyCategory'
import { useThemes } from '../hooks/useThemes'
import type { Theme } from '../types/theme'

type ModeForm = {
  name: string
  description: string
  level: string
  numbers: string
  type: number
  mode: number
  themeLevel1ID?: number
  themeLevel2ID?: number
  themeLevel3ID?: number
  requirements: string[]
}

const initial: ModeForm = { name: '', description: '', level: '', numbers: '', type: 2, mode: 1, requirements: [] }

/**
 * Study mode CRUD page.
 */
export const ModesPage = () => {
  const { currentCategory, currentType } = useStudyCategory()
  const { items, error, fetch, create, update, remove } = useModes()
  const { allItems: themes, fetchAll: fetchThemes } = useThemes()
  const [form, setForm] = useState(initial)
  const [editingID, setEditingID] = useState(0)
  const [formError, setFormError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [requirementCount, setRequirementCount] = useState(1)

  useEffect(() => {
    void fetch({ type: currentType })
  }, [currentType, fetch])

  useEffect(() => {
    void fetchThemes()
  }, [fetchThemes])

  const themesByID = useMemo(() => {
    const map = new Map<number, Theme>()
    for (const item of themes) map.set(item.id, item)
    return map
  }, [themes])

  const level1Themes = useMemo(() => themes.filter((item) => item.level === 1), [themes])
  const level2Themes = useMemo(
    () => themes.filter((item) => item.level === 2 && item.parent_id === form.themeLevel1ID),
    [form.themeLevel1ID, themes],
  )
  const level3Themes = useMemo(
    () => themes.filter((item) => item.level === 3 && item.parent_id === form.themeLevel2ID),
    [form.themeLevel2ID, themes],
  )

  const resetModal = () => {
    setForm({ ...initial, type: currentType })
    setEditingID(0)
    setFormError('')
    setIsModalOpen(false)
    setRequirementCount(1)
  }

  const openCreateModal = () => {
    setForm({ ...initial, type: currentType })
    setEditingID(0)
    setFormError('')
    setIsModalOpen(true)
    setRequirementCount(1)
  }

  const resolveThemeSelection = (themeID?: number) => {
    if (!themeID) {
      return { themeLevel1ID: undefined, themeLevel2ID: undefined, themeLevel3ID: undefined }
    }
    const current = themesByID.get(themeID)
    if (!current) {
      return { themeLevel1ID: undefined, themeLevel2ID: undefined, themeLevel3ID: undefined }
    }
    if (current.level === 1) {
      return { themeLevel1ID: current.id, themeLevel2ID: undefined, themeLevel3ID: undefined }
    }
    if (current.level === 2) {
      return { themeLevel1ID: current.parent_id, themeLevel2ID: current.id, themeLevel3ID: undefined }
    }
    const parentLevel2 = current.parent_id ? themesByID.get(current.parent_id) : undefined
    return {
      themeLevel1ID: parentLevel2?.parent_id,
      themeLevel2ID: parentLevel2?.id,
      themeLevel3ID: current.id,
    }
  }

  const openEditModal = (mode: (typeof items)[number]) => {
    setForm({
      name: mode.name,
      description: mode.description,
      level: String(mode.level),
      numbers: String(mode.numbers),
      type: mode.type,
      mode: mode.mode || 1,
      ...resolveThemeSelection(mode.theme_id),
      requirements: mode.requirements ?? [],
    })
    setEditingID(mode.id)
    setFormError('')
    setIsModalOpen(true)
    setRequirementCount(Math.max(1, Math.min(3, (mode.requirements ?? []).length)))
  }

  const submit = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (!form.level.trim()) {
      setFormError('Level is required.')
      return
    }
    if (!form.numbers.trim()) {
      setFormError('Nums is required.')
      return
    }
    const parsedLevel = Number(form.level)
    if (!Number.isInteger(parsedLevel) || parsedLevel < 1 || parsedLevel > 10) {
      setFormError('Level must be between 1 and 10.')
      return
    }
    const parsedNumbers = Number(form.numbers)
    if (!Number.isInteger(parsedNumbers) || parsedNumbers < 1) {
      setFormError('Nums must be at least 1.')
      return
    }
    const normalizedRequirements = form.requirements
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
    if (normalizedRequirements.length > 3) {
      setFormError('Requirements must be <= 3 items.')
      return
    }
    if (normalizedRequirements.some((item) => item.length > 200)) {
      setFormError('Each requirement must be <= 200 characters.')
      return
    }
    setFormError('')
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      level: parsedLevel,
      numbers: parsedNumbers,
      type: currentType,
      mode: form.mode,
      theme_id: form.themeLevel3ID ?? form.themeLevel2ID ?? form.themeLevel1ID,
      requirements: normalizedRequirements,
    }
    if (editingID) {
      await update(editingID, payload)
    } else {
      await create(payload)
    }
    resetModal()
  }

  const updateRequirement = (index: number, value: string) => {
    const next = [...form.requirements]
    next[index] = value
    setForm({ ...form, requirements: next })
  }

  const removeRequirement = (index: number) => {
    if (index < 1 || index >= requirementCount) return
    const next = [...form.requirements]
    if (index === 1 && requirementCount === 3) {
      next[1] = next[2] ?? ''
      next[2] = ''
    } else {
      next[index] = ''
    }
    setForm({ ...form, requirements: next })
    setRequirementCount((prev) => Math.max(1, prev - 1))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Study Modes · {categoryLabel[currentCategory]}</h1>
        <Button onClick={openCreateModal}>Create Mode</Button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="space-y-2">
        {items.map((mode) => (
          <Card key={mode.id} className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-start gap-40">
                <p className="break-words font-medium">{mode.name}</p>
                {mode.requirements?.length ? (
                  <div className="space-y-1 text-xs text-zinc-300">
                    {mode.requirements.slice(0, 3).map((requirement, index) => (
                      <p key={`${mode.id}-${index}`} className="break-words">
                        {requirement}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-zinc-500">Level {mode.level} · {mode.numbers}/day</p>
              <p className="text-xs text-zinc-500">{translationModeLabel[mode.mode] ?? ''}</p>
              {mode.theme_path ? <p className="text-xs text-zinc-500">Theme: {mode.theme_path}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEditModal(mode)}>
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => void remove(mode.id)}>Delete</Button>
            </div>
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <Card className="w-full max-w-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingID ? 'Edit Mode' : 'Create Mode'}</h2>
              <Button variant="ghost" size="sm" onClick={resetModal}>
                Close
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="w-32 shrink-0 text-sm text-zinc-300">Name:</p>
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    placeholder="Input name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <span className="w-4 text-center text-lg leading-none text-red-500">*</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="w-32 shrink-0 text-sm text-zinc-300">Description:</p>
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    placeholder="Input description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                  <span className="w-4" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="w-32 shrink-0 text-sm text-zinc-300">Level:</p>
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    placeholder="1-10"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                  />
                  <span className="w-4 text-center text-lg leading-none text-red-500">*</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="w-32 shrink-0 text-sm text-zinc-300">Nums:</p>
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Input nums"
                    value={form.numbers}
                    onChange={(e) => setForm({ ...form, numbers: e.target.value })}
                  />
                  <span className="w-4 text-center text-lg leading-none text-red-500">*</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="w-32 shrink-0 text-sm text-zinc-300">Direction:</p>
                <div className="flex flex-1 items-center gap-2">
                  <select
                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
                    value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: Number(e.target.value) })}
                  >
                    <option value={1}>中译英</option>
                    <option value={2}>英译中</option>
                  </select>
                  <span className="w-4" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="w-32 shrink-0 text-sm text-zinc-300">Theme:</p>
                <div className="flex flex-1 items-center gap-2">
                  <select
                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
                    value={form.themeLevel1ID ?? 0}
                    onChange={(e) => {
                      const nextLevel1ID = Number(e.target.value) || undefined
                      setForm((prev) => ({
                        ...prev,
                        themeLevel1ID: nextLevel1ID,
                        themeLevel2ID: undefined,
                        themeLevel3ID: undefined,
                      }))
                    }}
                  >
                    <option value={0}>Lv1 (Optional)</option>
                    {level1Themes.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <select
                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
                    disabled={!form.themeLevel1ID}
                    value={form.themeLevel2ID ?? 0}
                    onChange={(e) => {
                      const nextLevel2ID = Number(e.target.value) || undefined
                      setForm((prev) => ({
                        ...prev,
                        themeLevel2ID: nextLevel2ID,
                        themeLevel3ID: undefined,
                      }))
                    }}
                  >
                    <option value={0}>Lv2 (Optional)</option>
                    {level2Themes.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <select
                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
                    disabled={!form.themeLevel2ID}
                    value={form.themeLevel3ID ?? 0}
                    onChange={(e) => {
                      const nextLevel3ID = Number(e.target.value) || undefined
                      setForm((prev) => ({ ...prev, themeLevel3ID: nextLevel3ID }))
                    }}
                  >
                    <option value={0}>Lv3 (Optional)</option>
                    {level3Themes.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <span className="w-4" />
                </div>
              </div>
              {Array.from({ length: requirementCount }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <p className="w-32 shrink-0 text-sm text-zinc-300">Requirement {index + 1}:</p>
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      placeholder={`Input requirement ${index + 1}`}
                      value={form.requirements[index] ?? ''}
                      onChange={(e) => updateRequirement(index, e.target.value)}
                    />
                    {index === 0 ? (
                      requirementCount < 3 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => setRequirementCount((prev) => Math.min(3, prev + 1))}
                        >
                          +
                        </Button>
                      ) : (
                        <span className="h-9 w-9" />
                      )
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => removeRequirement(index)}
                      >
                        -
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {formError && <p className="text-sm text-red-400">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
              <Button onClick={() => void submit()}>{editingID ? 'Update' : 'Create'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
