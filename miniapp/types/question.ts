export type GeneratedQuestion = {
  question: string
  answer_key: string
  pre_generated_id?: number
}

export type UserQuestion = {
  id: number
  mode_id: number
  question: string
  answer_key: string
  answer_text: string
  score: number
  pre_generated_id?: number
  create_time: string
}

export type ExplainChatQuestionSnapshot = {
  question_id?: number
  index?: number
  question: string
  answer_key: string
  user_answer: string
}

export type ExplainChatPageContext = {
  page: 'practice' | 'history' | 'other'
  mode_id?: number
  study_type?: number
  translation_mode?: number
  current_question_index?: number
  question_snapshots?: ExplainChatQuestionSnapshot[]
}

export type ExplainChatPayload = {
  session_id?: string
  question_index?: number
  user_message: string
  page_context: ExplainChatPageContext
}

export type ExplainChatResponse = {
  session_id: string
  assistant_message: string
  resolved_question?: ExplainChatQuestionSnapshot
}
