import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { categoryLabel, translationModeLabel } from '../constants/study'
import { useModes } from '../hooks/useModes'
import { useQuestions } from '../hooks/useQuestions'
import { useStudyCategory } from '../hooks/useStudyCategory'
import { questionApi } from '../services/question'
import { useHelpChatStore } from '../store/helpChatStore'

/**
 * AI question generation and answer submit page.
 */
export const PracticePage = () => {
  const { currentCategory, currentType } = useStudyCategory()
  const { items: modes, fetch: fetchModes } = useModes()
  const { generated, generatedModeId, error, generate, create, generating } = useQuestions()
  const { setContext } = useHelpChatStore()
  const [modeId, setModeId] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [issues, setIssues] = useState<Record<number, string[]>>({})
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({})
  const selectedModeIdCandidate = modeId || generatedModeId
  const selectedModeId = modes.some((item) => item.id === selectedModeIdCandidate) ? selectedModeIdCandidate : 0
  const selectedMode = modes.find((item) => item.id === selectedModeId)

  useEffect(() => {
    void fetchModes({ type: currentType })
  }, [currentType, fetchModes])

  useEffect(() => {
    const answerIndexes = Object.keys(answers)
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0)
    const currentQuestionIndex = generated.length > 0 ? (answerIndexes.length > 0 ? answerIndexes[0] + 1 : 1) : undefined
    setContext({
      page: 'practice',
      mode_id: selectedMode?.id,
      study_type: currentType,
      translation_mode: selectedMode?.mode,
      current_question_index: currentQuestionIndex,
      question_snapshots: generated.map((item, index) => ({
        index: index + 1,
        question: item.question,
        answer_key: item.answer_key,
        user_answer: answers[index] ?? '',
      })),
    })
  }, [answers, currentType, generated, selectedMode?.id, selectedMode?.mode, setContext])

  const submit = async (index: number) => {
    const current = generated[index]
    if (!current || !selectedModeId) return
    if (submitting[index]) return
    const answer = answers[index] ?? ''
    setSubmitting((prev) => ({ ...prev, [index]: true }))
    try {
      const analysis = await questionApi.analyze({
        mode_id: selectedModeId,
        question: current.question,
        answer_text: answer,
        answer_key: current.answer_key,
      })
      setIssues((prev) => ({ ...prev, [index]: analysis }))
      await create({
        mode_id: selectedModeId,
        question: current.question,
        answer_key: current.answer_key,
        answer_text: answer,
        score: analysis.length === 0 ? 100 : Math.max(60, 100 - analysis.length * 10),
        pre_generated_id: current.pre_generated_id,
      })
    } finally {
      setSubmitting((prev) => ({ ...prev, [index]: false }))
    }
  }

  const regenerate = async () => {
    if (!selectedModeId) return
    if (generating) return
    setAnswers({})
    setIssues({})
    await generate(selectedModeId)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Practice · {categoryLabel[currentCategory]}</h1>
      <Card className="space-y-2">
        <select
          className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
          value={selectedModeId}
          onChange={(e) => setModeId(Number(e.target.value))}
        >
          <option value={0}>Select mode</option>
          {modes.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.name} · {translationModeLabel[mode.mode] ?? '-'} · Lv{mode.level} · {mode.numbers} questions
            </option>
          ))}
        </select>
        {selectedMode && (
          <p className="text-xs text-zinc-400">
            当前方向：{translationModeLabel[selectedMode.mode] ?? '-'}
          </p>
        )}
        <Button onClick={() => void regenerate()} disabled={!selectedModeId || generating}>
          {generating ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border border-zinc-500 border-t-transparent" />
              Generating...
            </span>
          ) : (
            'Generate Question'
          )}
        </Button>
        {selectedModeId > 0 && generating && (
          <Card className="flex h-52 items-center justify-center border-zinc-700">
            <div className="inline-flex items-center gap-3 text-sm text-zinc-300">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
              正在生成题目，请稍候...
            </div>
          </Card>
        )}
        {selectedModeId > 0 && generated.length > 0 && generatedModeId === selectedModeId && (
          <div className="space-y-3">
            {generated.map((item, index) => (
              <Card key={`${item.question}-${index}`} className="space-y-2 border-zinc-700">
                <p className="text-sm text-zinc-300">{index + 1}. {item.question}</p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      className={submitting[index] ? 'pr-9' : ''}
                      placeholder="Your answer"
                      value={answers[index] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [index]: e.target.value }))}
                    />
                    {submitting[index] && (
                      <span
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent"
                        aria-label="Submitting answer"
                      />
                    )}
                  </div>
                  <Button variant="outline" onClick={() => void submit(index)} disabled={!!submitting[index]}>
                    {submitting[index] ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border border-zinc-500 border-t-transparent" />
                        Submitting...
                      </span>
                    ) : (
                      'Submit Answer'
                    )}
                  </Button>
                </div>
                {issues[index]?.length ? (
                  <div className="space-y-2">
                    <ul className="list-disc space-y-1 pl-5 text-xs text-red-400">
                      {issues[index].map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-emerald-300">Standard answer: {item.answer_key}</p>
                  </div>
                ) : (
                  issues[index] && <p className="text-xs text-emerald-300">👍 you are very good</p>
                )}
              </Card>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </Card>
    </div>
  )
}
