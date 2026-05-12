import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { categoryLabel } from '../constants/study'
import { useStudyCategory } from '../hooks/useStudyCategory'
import { wordApi } from '../services/word'
import { useWords } from '../hooks/useWords'
import type { WordListFilters } from '../types/word'

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const StudyPage = () => {
  const { currentCategory } = useStudyCategory()
  const { items, loading, error, fetchAll } = useWords()
  const [searchWord, setSearchWord] = useState('')
  const [selectedL1Category, setSelectedL1Category] = useState('')
  const [selectedL2Category, setSelectedL2Category] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [exportingType, setExportingType] = useState<'all' | 'filtered' | ''>('')

  useEffect(() => {
    if (currentCategory !== 'word') return
    void fetchAll()
  }, [currentCategory, fetchAll])

  const l1Categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.l1_category).filter(Boolean))).sort(),
    [items],
  )

  const l2Categories = useMemo(() => {
    const filtered = selectedL1Category
      ? items.filter((item) => item.l1_category === selectedL1Category)
      : items
    return Array.from(new Set(filtered.map((item) => item.l2_category).filter(Boolean))).sort()
  }, [items, selectedL1Category])

  const activeL2Category = l2Categories.includes(selectedL2Category) ? selectedL2Category : ''

  const tags = useMemo(
    () =>
      Array.from(
        new Set(
          items.flatMap((item) => item.tags.map((tag) => tag.category_name).filter(Boolean)),
        ),
      ).sort(),
    [items],
  )

  const filteredWords = useMemo(() => {
    const keyword = searchWord.trim().toLowerCase()
    return items.filter((item) => {
      if (keyword && !item.word.toLowerCase().includes(keyword)) return false
      if (selectedL1Category && item.l1_category !== selectedL1Category) return false
      if (activeL2Category && item.l2_category !== activeL2Category) return false
      if (selectedTag && !item.tags.some((tag) => tag.category_name === selectedTag)) return false
      return true
    })
  }, [activeL2Category, items, searchWord, selectedL1Category, selectedTag])

  const filteredExportFilters = useMemo<WordListFilters>(
    () => ({
      word: searchWord.trim() || undefined,
      l1_category: selectedL1Category || undefined,
      l2_category: activeL2Category || undefined,
      tag: selectedTag || undefined,
    }),
    [activeL2Category, searchWord, selectedL1Category, selectedTag],
  )

  const exportWords = async (type: 'all' | 'filtered') => {
    setExportingType(type)
    try {
      const blob = await wordApi.export(type === 'all' ? undefined : filteredExportFilters)
      const filename = type === 'all' ? 'words-all.xlsx' : 'words-filtered.xlsx'
      downloadBlob(blob, filename)
    } finally {
      setExportingType('')
    }
  }

  if (currentCategory !== 'word') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Study · {categoryLabel[currentCategory]}</h1>
        <Card className="space-y-2">
          <p className="text-sm text-zinc-300">
            当前学习页已优先升级为单词学习页面，句子和文章模块暂时保留为后续扩展入口。
          </p>
          <p className="text-sm text-zinc-500">请从左侧切换到“单词”查看知识库内容。</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">单词学习</h1>
          <p className="text-sm text-zinc-400">支持按单词模糊搜索、分类筛选，并导出全量或当前筛选结果。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void exportWords('all')}
            disabled={exportingType !== ''}
          >
            {exportingType === 'all' ? '导出中...' : '导出全量 Excel'}
          </Button>
          <Button
            onClick={() => void exportWords('filtered')}
            disabled={exportingType !== ''}
          >
            {exportingType === 'filtered' ? '导出中...' : '导出筛选 Excel'}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">单词搜索</span>
          <Input
            placeholder="输入 word 进行模糊搜索"
            value={searchWord}
            onChange={(event) => setSearchWord(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">一级分类</span>
          <select
            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
            value={selectedL1Category}
            onChange={(event) => setSelectedL1Category(event.target.value)}
          >
            <option value="">全部分类</option>
            {l1Categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">二级分类</span>
          <select
            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
            value={activeL2Category}
            onChange={(event) => setSelectedL2Category(event.target.value)}
          >
            <option value="">全部子分类</option>
            {l2Categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">标签</span>
          <select
            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
            value={selectedTag}
            onChange={(event) => setSelectedTag(event.target.value)}
          >
            <option value="">全部标签</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Card className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          当前共显示 <span className="font-semibold text-zinc-100">{filteredWords.length}</span> / {items.length} 条单词
        </p>
        {(searchWord || selectedL1Category || activeL2Category || selectedTag) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchWord('')
              setSelectedL1Category('')
              setSelectedL2Category('')
              setSelectedTag('')
            }}
          >
            清空筛选
          </Button>
        )}
      </Card>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading && (
                <tr>
                  <td className="px-4 py-6 text-zinc-400" colSpan={5}>
                    正在加载单词数据...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td className="px-4 py-6 text-red-400" colSpan={5}>
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && filteredWords.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-zinc-400" colSpan={5}>
                    暂无符合条件的单词，请调整搜索或筛选条件。
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filteredWords.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-4 font-semibold text-zinc-100">{item.word}</td>
                    <td className="px-4 py-4 text-zinc-300">{item.definition}</td>
                    <td className="px-4 py-4 text-zinc-400">
                      <div>{item.l1_category || <span className="text-zinc-500">未分类</span>}</div>
                      {item.l2_category && <div className="text-xs text-zinc-500">{item.l2_category}</div>}
                    </td>
                    <td className="px-4 py-4 text-zinc-300">
                      <div className="flex flex-wrap gap-2">
                        {item.tags.length > 0 ? (
                          item.tags.map((tag) => (
                            <span
                              key={tag.id || `${item.id}-${tag.category_id}-${tag.category_name}`}
                              className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                            >
                              {tag.category_name}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-500">无标签</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-zinc-300">
                      {item.example || <span className="text-zinc-500">暂无例句</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
