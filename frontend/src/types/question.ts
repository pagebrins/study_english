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

export type QuestionPayload = Omit<UserQuestion, 'id' | 'create_time'>

export type QuestionListFilters = {
  start_date?: string
  end_date?: string
  mode_ids?: number[]
  type?: number
  mode?: number
  min_score?: number
  max_score?: number
}

export type GeneratedQuestion = {
  question: string
  answer_key: string
  pre_generated_id?: number
}

export type GeneratedQuestionList = GeneratedQuestion[]

export type AnswerIssueList = string[]

export type ChatQuestionSnapshot = {
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
  question_snapshots?: ChatQuestionSnapshot[]
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
  resolved_question?: ChatQuestionSnapshot
}
