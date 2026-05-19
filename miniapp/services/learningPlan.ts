import type { LearningPlanBundle, SetLearningGoalPayload, SubmitLearningAssessmentPayload } from '../types/learningPlan'
import { request } from '../utils/request'

export const learningPlanService = {
  current: () =>
    request<LearningPlanBundle>({
      url: '/learning-plans/current',
    }),
  setGoal: (payload: SetLearningGoalPayload) =>
    request<LearningPlanBundle>({
      url: '/learning-profiles/goal',
      method: 'POST',
      data: payload,
    }),
  submitAssessment: (payload: SubmitLearningAssessmentPayload) =>
    request<LearningPlanBundle>({
      url: '/learning-assessments/submit',
      method: 'POST',
      data: payload,
    }),
}
