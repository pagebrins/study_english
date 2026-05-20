import { questionService } from '../../services/question'
import { requireLogin } from '../../utils/guard'
import { hasPermission } from '../../utils/permission'
import { getExplainContext, getStorageUser } from '../../utils/session'
import type { ExplainChatPageContext } from '../../types/question'

type ChatMessage = {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatData = {
  loading: boolean
  sending: boolean
  error: string
  input: string
  sessionID: string
  messages: ChatMessage[]
  source: string
  canUseChat: boolean
}

const buildMessage = (role: ChatMessage['role'], content: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  content,
})

Page<ChatData>({
  data: {
    loading: false,
    sending: false,
    error: '',
    input: '',
    sessionID: '',
    messages: [],
    source: 'other',
    canUseChat: false,
  },
  onLoad(query) {
    this.setData({
      source: query.source || 'other',
    })
  },
  onShow() {
    if (!requireLogin()) return
    const canUseChat = hasPermission(getStorageUser(), 'chat.use')
    if (!canUseChat) {
      this.setData({ canUseChat, error: '当前账号没有 AI 讲解权限。', messages: [] })
      wx.showToast({ title: '当前账号没有 AI 讲解权限', icon: 'none' })
      return
    }
    const context = getExplainContext()
    const messages: ChatMessage[] = []
    if (context?.current_question_index) {
      messages.push(buildMessage('system', `已定位到第 ${context.current_question_index} 题，你可以直接追问这题。`))
    } else {
      messages.push(buildMessage('system', '可以直接提问；如果想聊某一道题，请在问题里写出题号。'))
    }
    this.setData({ messages, canUseChat, error: '' })
  },
  onInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ input: event.detail.value })
  },
  async onSend() {
    if (!this.data.canUseChat) return
    const userMessage = this.data.input.trim()
    const context = getExplainContext() ?? ({ page: 'other' } as ExplainChatPageContext)
    if (!userMessage || this.data.sending) return
    const nextMessages = [...this.data.messages, buildMessage('user', userMessage)]
    this.setData({ sending: true, input: '', messages: nextMessages, error: '' })
    try {
      const result = await questionService.explainChat({
        session_id: this.data.sessionID || undefined,
        user_message: userMessage,
        page_context: context,
      })
      const assistantMessages = [...nextMessages]
      if (result.resolved_question?.index) {
        assistantMessages.push(buildMessage('system', `AI 已定位到第 ${result.resolved_question.index} 题。`))
      }
      assistantMessages.push(buildMessage('assistant', result.assistant_message))
      this.setData({
        sessionID: result.session_id,
        messages: assistantMessages,
      })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : 'AI 讲解失败',
      })
    } finally {
      this.setData({ sending: false })
    }
  },
})
