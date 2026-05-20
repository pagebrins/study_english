import type { Pronunciation } from './pronunciation'

export type LearningProfile = {
  id: number
  user_id: number
  goal: string
  daily_minutes: number
  study_time_range: string
  translation_mode: number
  focuses: string[]
  notes: string
  word_level: number
  sentence_level: number
  overall_level: number
  onboarding_completed: boolean
  last_assessment_at?: string
  next_assessment_type: string
  next_assessment_due_date?: string
  created_at: string
  updated_at: string
}

export type LearningAssessment = {
  id: number
  user_id: number
  profile_id: number
  assessment_type: 'initial' | 'upgrade' | 'downgrade'
  trigger_reason: string
  status: string
  word_level_before: number
  sentence_level_before: number
  word_level_after: number
  sentence_level_after: number
  overall_level_after: number
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export type LearningAssessmentItem = {
  id: number
  assessment_id: number
  study_type: number
  translation_mode: number
  level: number
  question: string
  answer_key: string
  user_answer: string
  score: number
  question_pronunciation?: Pronunciation
  answer_key_pronunciation?: Pronunciation
  created_at: string
  updated_at: string
}

export type LearningPlan = {
  id: number
  user_id: number
  profile_id: number
  assessment_id?: number
  title: string
  goal_summary: string
  status: string
  version: number
  plan_date: string
  created_at: string
  updated_at: string
}

export type LearningPlanItem = {
  id: number
  plan_id: number
  user_id: number
  name: string
  description: string
  study_type: number
  translation_mode: number
  level: number
  numbers: number
  estimated_minutes: number
  theme_id?: number
  theme_path?: string
  requirements: string[]
  mode_id?: number
  sort_order: number
  status: string
  created_at: string
  updated_at: string
}

export type LearningPlanBundle = {
  profile?: LearningProfile
  assessment?: LearningAssessment
  assessment_items: LearningAssessmentItem[]
  plan?: LearningPlan
  items: LearningPlanItem[]
  goal_required: boolean
  assessment_required: boolean
  plan_generation_required: boolean
}

export type SetLearningGoalPayload = {
  goal: string
  daily_minutes?: number
  study_time_range?: string
}

export type SubmitLearningAssessmentPayload = {
  assessment_id: number
  answers: Array<{ item_id: number; user_answer: string }>
}
