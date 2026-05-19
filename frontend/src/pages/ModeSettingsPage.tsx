import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useModes } from '../hooks/useModes'
import type { ModePayload, StudyMode } from '../types/mode'

const emptyDraft: ModePayload = {
  name: '',
  description: '',
  level: 3,
  numbers: 5,
  type: 2,
  mode: 1,
  requirements: [],
}

const typeLabel: Record<number, string> = {
  1: '单词',
  2: '句子',
  3: '文章',
}

const translationLabel: Record<number, string> = {
  1: '中译英',
  2: '英译中',
}

export const ModeSettingsPage = () => {
  const { items, error, fetch, create, update, remove } = useModes()
  const [draft, setDraft] = useState<ModePayload>(emptyDraft)
  const [editingID, setEditingID] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetch()
  }, [fetch])

  const manualModes = useMemo(
    () => items.filter((item) => item.source === 'manual'),
    [items],
  )

  const requirementText = draft.requirements.join('\n')

  const resetDraft = () => {
    setDraft(emptyDraft)
    setEditingID(null)
  }

  const applyMode = (mode: StudyMode) => {
    setEditingID(mode.id)
    setDraft({
      name: mode.name,
      description: mode.description,
      level: mode.level,
      numbers: mode.numbers,
      type: mode.type,
      mode: mode.mode,
      theme_id: mode.theme_id,
      requirements: mode.requirements,
    })
  }

  const submit = async () => {
    setSaving(true)
    const payload: ModePayload = {
      ...draft,
      requirements: requirementText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    }
    try {
      if (editingID) {
        await update(editingID, payload)
      } else {
        await create(payload)
      }
      resetDraft()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Mode Settings</h1>
        <p className="text-sm text-zinc-400">管理自定义学习模式，供 Practice 页面直接使用。</p>
      </div>

      {error && <Card><p className="text-sm text-red-400">{error}</p></Card>}

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{editingID ? '编辑模式' : '新建模式'}</h2>
          {editingID && (
            <Button variant="ghost" onClick={resetDraft}>
              取消编辑
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="模式名称" value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
          <Input placeholder="模式描述" value={draft.description} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} />
          <Input type="number" min="1" max="10" value={draft.level} onChange={(event) => setDraft((prev) => ({ ...prev, level: Number(event.target.value) || 1 }))} />
          <Input type="number" min="1" value={draft.numbers} onChange={(event) => setDraft((prev) => ({ ...prev, numbers: Number(event.target.value) || 1 }))} />
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">题型</span>
            <select
              className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
              value={draft.type}
              onChange={(event) => setDraft((prev) => ({ ...prev, type: Number(event.target.value) }))}
            >
              <option value={1}>单词</option>
              <option value={2}>句子</option>
              <option value={3}>文章</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">翻译方向</span>
            <select
              className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
              value={draft.mode}
              onChange={(event) => setDraft((prev) => ({ ...prev, mode: Number(event.target.value) }))}
            >
              <option value={1}>中译英</option>
              <option value={2}>英译中</option>
            </select>
          </label>
        </div>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">要求列表（每行一条）</span>
          <textarea
            className="min-h-[120px] w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            value={requirementText}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                requirements: event.target.value.split('\n'),
              }))
            }
          />
        </label>
        <Button onClick={() => void submit()} disabled={saving}>
          {saving ? '保存中...' : editingID ? '保存更新' : '创建模式'}
        </Button>
      </Card>

      <div className="space-y-3">
        {manualModes.map((mode) => (
          <Card key={mode.id} className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="font-medium">{mode.name}</p>
                <p className="text-sm text-zinc-400">{mode.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>{typeLabel[mode.type] ?? mode.type}</span>
                  <span>{translationLabel[mode.mode] ?? mode.mode}</span>
                  <span>Lv{mode.level}</span>
                  <span>{mode.numbers} 题</span>
                </div>
                {mode.requirements.length > 0 && (
                  <div className="space-y-1 text-xs text-zinc-300">
                    {mode.requirements.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => applyMode(mode)}>
                  编辑
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void remove(mode.id)}>
                  删除
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {manualModes.length === 0 && (
          <Card>
            <p className="text-sm text-zinc-400">还没有自定义 mode，先创建一个吧。</p>
          </Card>
        )}
      </div>
    </div>
  )
}
