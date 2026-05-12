const { questionService } = require('../../services/question')
const { requireLogin } = require('../../utils/guard')
const { getExplainContext } = require('../../utils/session')

const buildMessage = (role, content) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  content,
})

Page({
  data: {
    loading: false,
    sending: false,
    error: '',
    input: '',
    sessionID: '',
    messages: [],
    source: 'other',
  },
  onLoad(query) {
    this.setData({
      source: query.source || 'other',
    })
  },
  onShow() {
    if (!requireLogin()) return
    const context = getExplainContext()
    const messages = []
    if (context && context.current_question_index) {
      messages.push(buildMessage('system', `已定位到第 ${context.current_question_index} 题，你可以直接追问这题。`))
    } else {
      messages.push(buildMessage('system', '可以直接提问；如果想聊某一道题，请在问题里写出题号。'))
    }
    this.setData({ messages })
  },
  onInput(event) {
    this.setData({ input: event.detail.value })
  },
  async onSend() {
    const userMessage = this.data.input.trim()
    const context = getExplainContext() || { page: 'other' }
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
      if (result.resolved_question && result.resolved_question.index) {
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
