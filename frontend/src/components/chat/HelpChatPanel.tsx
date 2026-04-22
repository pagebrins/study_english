import { Minimize2, SendHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useHelpChatStore } from '../../store/helpChatStore'
import { questionApi } from '../../services/question'

export const HelpChatPanel = () => {
  const { pending, messages, context, sessionId, setPending, pushMessage, updateSessionId, minimize } = useHelpChatStore()
  const [question, setQuestion] = useState('')

  const canSend = useMemo(() => question.trim().length > 0 && !pending, [pending, question])

  const send = async () => {
    const userMessage = question.trim()
    if (!userMessage) return
    setQuestion('')
    pushMessage('user', userMessage)
    setPending(true)
    try {
      const result = await questionApi.explainChat({
        session_id: sessionId,
        user_message: userMessage,
        page_context: context,
      })
      if (result.session_id && result.session_id !== sessionId) {
        updateSessionId(result.session_id)
      }
      if (result.resolved_question?.index) {
        pushMessage('system', `已定位到第 ${result.resolved_question.index} 题。`)
      }
      pushMessage('assistant', result.assistant_message)
    } catch (error) {
      pushMessage('system', (error as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-100">答疑助手</h3>
        <Button type="button" variant="ghost" size="sm" onClick={minimize} title="Minimize">
          <Minimize2 size={16} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`rounded-md px-3 py-2 text-sm ${
              item.role === 'user'
                ? 'ml-8 bg-zinc-700 text-zinc-100'
                : item.role === 'assistant'
                  ? 'mr-8 bg-zinc-900 text-zinc-200'
                  : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {item.content}
          </div>
        ))}
      </div>
      <div className="shrink-0 space-y-2 border-t border-zinc-800 p-3">
        <div className="flex items-center gap-2">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="请输入你的疑问（可在内容中写题号，如：第3题为什么错）..."
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void send()
              }
            }}
          />
          <Button type="button" onClick={() => void send()} disabled={!canSend}>
            <SendHorizontal size={15} />
          </Button>
        </div>
      </div>
    </div>
  )
}
