import { format, parseISO } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { categoryLabel } from '../constants/study'
import { useModes } from '../hooks/useModes'
import { useQuestions } from '../hooks/useQuestions'
import { useScore } from '../hooks/useScore'
import { useStudyCategory } from '../hooks/useStudyCategory'
import { useHelpChatStore } from '../store/helpChatStore'
import type { QuestionListFilters } from '../types/question'

/**
 * Learned question history page.
 */
export const HistoryPage = () => {
  const { currentCategory, currentType } = useStudyCategory()
  const { items, fetch, remove, update } = useQuestions()
  const { items: modes, fetch: fetchModes } = useModes()
  const { recalculate, today } = useScore()
  const { setContext } = useHelpChatStore()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedModeIDs, setSelectedModeIDs] = useState<number[]>([])
  const [minScore, setMinScore] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [filterError, setFilterError] = useState('')
  const [isModePickerOpen, setIsModePickerOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const modePickerRef = useRef<HTMLDivElement | null>(null)
  const datePickerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    void fetch({ type: currentType })
    void fetchModes({ type: currentType })
  }, [currentType, fetch, fetchModes])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (modePickerRef.current && !modePickerRef.current.contains(event.target as Node)) {
        setIsModePickerOpen(false)
      }
      if (!datePickerRef.current) return
      if (!datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const selectedMode = selectedModeIDs.length === 1 ? modes.find((item) => item.id === selectedModeIDs[0]) : undefined
    setContext({
      page: 'history',
      study_type: currentType,
      translation_mode: selectedMode?.mode,
      question_snapshots: items.map((item, index) => ({
        question_id: item.id,
        index: index + 1,
        question: item.question,
        answer_key: item.answer_key,
        user_answer: item.answer_text,
      })),
    })
  }, [currentType, items, modes, selectedModeIDs, setContext])

  const selectedRange = useMemo<DateRange | undefined>(() => {
    if (!startDate && !endDate) return undefined
    return {
      from: startDate ? parseISO(startDate) : undefined,
      to: endDate ? parseISO(endDate) : undefined,
    }
  }, [startDate, endDate])

  const dateRangeLabel = useMemo(() => {
    if (startDate && endDate) return `${startDate} -> ${endDate}`
    if (startDate) return `${startDate} -> End date`
    return 'Select date range'
  }, [startDate, endDate])

  const modeFilterLabel = useMemo(() => {
    if (selectedModeIDs.length === 0) return 'All modes'
    if (selectedModeIDs.length === 1) {
      const selected = modes.find((mode) => mode.id === selectedModeIDs[0])
      return selected?.name ?? '1 mode selected'
    }
    return `${selectedModeIDs.length} modes selected`
  }, [modes, selectedModeIDs])

  const onDateRangeSelect = (range: DateRange | undefined) => {
    setStartDate(range?.from ? format(range.from, 'yyyy-MM-dd') : '')
    setEndDate(range?.to ? format(range.to, 'yyyy-MM-dd') : '')
  }

  const toggleModeID = (modeID: number) => {
    setSelectedModeIDs((prev) =>
      prev.includes(modeID) ? prev.filter((id) => id !== modeID) : [...prev, modeID],
    )
  }

  const buildFilters = (): QuestionListFilters | null => {
    if (startDate && endDate && startDate > endDate) {
      setFilterError('Start date must be earlier than or equal to end date.')
      return null
    }

    const parsedMinScore = minScore ? Number(minScore) : undefined
    const parsedMaxScore = maxScore ? Number(maxScore) : undefined
    if ((parsedMinScore !== undefined && Number.isNaN(parsedMinScore)) || (parsedMaxScore !== undefined && Number.isNaN(parsedMaxScore))) {
      setFilterError('Score range must be valid numbers.')
      return null
    }
    if (parsedMinScore !== undefined && parsedMaxScore !== undefined && parsedMinScore > parsedMaxScore) {
      setFilterError('Min score must be less than or equal to max score.')
      return null
    }

    setFilterError('')
    return {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      mode_ids: selectedModeIDs.length ? selectedModeIDs : undefined,
      type: currentType,
      min_score: parsedMinScore,
      max_score: parsedMaxScore,
    }
  }

  const applyFilters = async () => {
    const nextFilters = buildFilters()
    if (!nextFilters) return
    await fetch(nextFilters)
  }

  const resetFilters = async () => {
    setStartDate('')
    setEndDate('')
    setSelectedModeIDs([])
    setMinScore('')
    setMaxScore('')
    setFilterError('')
    await fetch({ type: currentType })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">History · {categoryLabel[currentCategory]}</h1>
        <Button variant="outline" onClick={() => void recalculate({ type: currentType })}>
          Recalculate Score ({today?.score ?? 0})
        </Button>
      </div>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex min-w-[280px] flex-1 items-center gap-2" ref={modePickerRef}>
            <p className="shrink-0 text-sm text-zinc-200">Mode:</p>
            <button
              type="button"
              className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-left text-sm text-zinc-200 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600"
              onClick={() => setIsModePickerOpen((prev) => !prev)}
            >
              {modeFilterLabel}
            </button>
            {isModePickerOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-950 p-2 shadow-xl">
                <button
                  type="button"
                  className="mb-2 w-full rounded px-2 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                  onClick={() => setSelectedModeIDs([])}
                >
                  Clear mode selection
                </button>
                <div className="space-y-1">
                  {modes.map((mode) => (
                    <label
                      key={mode.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModeIDs.includes(mode.id)}
                        onChange={() => toggleModeID(mode.id)}
                      />
                      <span>{mode.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative flex min-w-[340px] flex-1 items-center gap-2" ref={datePickerRef}>
            <p className="shrink-0 text-sm text-zinc-200">Created At:</p>
            <button
              type="button"
              className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-left text-sm text-zinc-200 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600"
              onClick={() => setIsDatePickerOpen((prev) => !prev)}
            >
              {dateRangeLabel}
            </button>
            {isDatePickerOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 rounded-md border border-zinc-700 bg-zinc-950 p-3 shadow-xl">
                <DayPicker
                  mode="range"
                  numberOfMonths={2}
                  selected={selectedRange}
                  onSelect={onDateRangeSelect}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDate('')
                      setEndDate('')
                    }}
                  >
                    Clear
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsDatePickerOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex min-w-[260px] flex-1 items-center gap-2">
            <p className="shrink-0 text-sm text-zinc-200">Score:</p>
            <div className="flex w-full items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              />
              <span className="text-zinc-400">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>
          </div>

          <Button variant="outline" onClick={() => void applyFilters()}>
            Apply
          </Button>
          <Button variant="ghost" onClick={() => void resetFilters()}>
            Reset
          </Button>
        </div>
        {filterError && <p className="text-sm text-red-400">{filterError}</p>}
      </Card>
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className="space-y-2">
            <div>
              <p>{item.question}</p>
              <p className="text-xs text-zinc-500">Answer key: {item.answer_key} · Score: {item.score}</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                defaultValue={item.answer_text}
                onBlur={(e) =>
                  void update(item.id, {
                    mode_id: item.mode_id,
                    question: item.question,
                    answer_key: item.answer_key,
                    answer_text: e.target.value,
                    score: e.target.value.trim().toLowerCase() === item.answer_key.trim().toLowerCase() ? 100 : 60,
                  })
                }
              />
              <Button size="sm" variant="outline" onClick={() => void remove(item.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
