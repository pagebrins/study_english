import { create } from 'zustand'
import type { ExplainChatPageContext } from '../types/question'

export type HelpChatMessage = {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
}

type HelpChatState = {
  isOpen: boolean
  isMinimized: boolean
  pending: boolean
  sessionId: string
  messages: HelpChatMessage[]
  context: ExplainChatPageContext
  lastHintKey: string
  setPending: (pending: boolean) => void
  open: () => void
  close: () => void
  minimize: () => void
  restore: () => void
  setContext: (context: ExplainChatPageContext) => void
  pushMessage: (role: HelpChatMessage['role'], content: string) => void
  ensureOpenHint: () => void
  updateSessionId: (sessionId: string) => void
}

const newMessageID = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
const newSessionID = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const buildHint = (context: ExplainChatPageContext) => {
  const snapshots = context.question_snapshots ?? []
  const currentIndex = context.current_question_index
  if (currentIndex && snapshots.some((item) => item.index === currentIndex)) {
    return {
      key: `active-${context.page}-${currentIndex}-${snapshots.length}`,
      text: `检测到你正在做第 ${currentIndex} 题。可直接提问；如果是其他题，请在问题里写出题号。`,
    }
  }
  if (snapshots.length > 0) {
    return {
      key: `list-${context.page}-${snapshots.length}`,
      text: '可以直接提问；如果是特定题目，请在问题中写出题号。',
    }
  }
  return {
    key: `empty-${context.page}`,
    text: '请输入你的问题；如果与某道题有关，请先输入题号。',
  }
}

export const useHelpChatStore = create<HelpChatState>((set, get) => ({
  isOpen: false,
  isMinimized: false,
  pending: false,
  sessionId: newSessionID(),
  messages: [],
  context: { page: 'other' },
  lastHintKey: '',
  setPending: (pending) => set({ pending }),
  open: () => set({ isOpen: true, isMinimized: false }),
  close: () => set({ isOpen: false, isMinimized: false }),
  minimize: () => set({ isOpen: true, isMinimized: true }),
  restore: () => set({ isOpen: true, isMinimized: false }),
  setContext: (context) => set({ context }),
  pushMessage: (role, content) =>
    set((state) => ({
      messages: [...state.messages, { id: newMessageID(), role, content }],
    })),
  ensureOpenHint: () => {
    const state = get()
    const hint = buildHint(state.context)
    if (state.lastHintKey === hint.key) return
    set({
      lastHintKey: hint.key,
      messages: [...state.messages, { id: newMessageID(), role: 'system', content: hint.text }],
    })
  },
  updateSessionId: (sessionId) => set({ sessionId }),
}))
