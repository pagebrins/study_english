import type { LearningPlanBundle, SetLearningGoalPayload, SubmitLearningAssessmentPayload } from '../types/learningPlan'
import { getResult, http } from './http'

export const learningPlanApi = {
  current: () => getResult<LearningPlanBundle>(http.get('/learning-plans/current')),
  generate: () => getResult<LearningPlanBundle>(http.post('/learning-plans/generate')),
  setGoal: (payload: SetLearningGoalPayload) =>
    getResult<LearningPlanBundle>(http.post('/learning-profiles/goal', payload)),
  submitAssessment: (payload: SubmitLearningAssessmentPayload) =>
    getResult<LearningPlanBundle>(http.post('/learning-assessments/submit', payload)),
}
