package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"study_english/backend/internal/model"
	"study_english/backend/internal/repository"
)

const (
	modeSourceManual   = "manual"
	modeSourcePlanAuto = "plan_auto"

	assessmentTypeInitial   = "initial"
	assessmentTypeUpgrade   = "upgrade"
	assessmentTypeDowngrade = "downgrade"

	assessmentTriggerOnboarding = "onboarding"
	assessmentTriggerUpgrade    = "90_percent_full_score"
	assessmentTriggerDowngrade  = "90_percent_not_full_score"
)

type SetLearningGoalParams struct {
	Goal           string `json:"goal"`
	DailyMinutes   int    `json:"daily_minutes"`
	StudyTimeRange string `json:"study_time_range"`
}

type AssessmentAnswerSubmission struct {
	ItemID     uint   `json:"item_id"`
	UserAnswer string `json:"user_answer"`
}

type SubmitLearningAssessmentParams struct {
	AssessmentID uint                         `json:"assessment_id"`
	Answers      []AssessmentAnswerSubmission `json:"answers"`
}

// LearningPlanBundle returns current learning status including goal, assessment and plan.
type LearningPlanBundle struct {
	Profile                *model.LearningProfile         `json:"profile,omitempty"`
	Assessment             *model.LearningAssessment      `json:"assessment,omitempty"`
	AssessmentItems        []model.LearningAssessmentItem `json:"assessment_items"`
	Plan                   *model.LearningPlan            `json:"plan,omitempty"`
	Items                  []model.LearningPlanItem       `json:"items"`
	GoalRequired           bool                           `json:"goal_required"`
	AssessmentRequired     bool                           `json:"assessment_required"`
	PlanGenerationRequired bool                           `json:"plan_generation_required"`
}

// LearningPlanService handles learning goal, assessment and plan lifecycle.
type LearningPlanService struct {
	repo      *repository.Repository
	questions *QuestionService
}

// NewLearningPlanService creates learning plan service.
func NewLearningPlanService(repo *repository.Repository, questions *QuestionService) *LearningPlanService {
	return &LearningPlanService{repo: repo, questions: questions}
}

func (s *LearningPlanService) GetCurrent(requestID string, userID uint) (*LearningPlanBundle, error) {
	profile, err := s.repo.GetLearningProfileByUser(requestID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &LearningPlanBundle{
				GoalRequired:    true,
				AssessmentItems: []model.LearningAssessmentItem{},
				Items:           []model.LearningPlanItem{},
			}, nil
		}
		return nil, err
	}

	if assessment, items, err := s.repo.GetLatestActiveLearningAssessment(requestID, userID); err == nil {
		enrichAssessmentItemsWithPronunciation(items)
		return &LearningPlanBundle{
			Profile:            profile,
			Assessment:         assessment,
			AssessmentItems:    items,
			AssessmentRequired: true,
			Items:              []model.LearningPlanItem{},
		}, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if s.isAssessmentDue(profile) {
		assessment, items, err := s.createAssessmentForProfile(requestID, profile)
		if err != nil {
			return nil, err
		}
		enrichAssessmentItemsWithPronunciation(items)
		return &LearningPlanBundle{
			Profile:            profile,
			Assessment:         assessment,
			AssessmentItems:    items,
			AssessmentRequired: true,
			Items:              []model.LearningPlanItem{},
		}, nil
	}

	plan, items, err := s.repo.GetActiveLearningPlan(requestID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if !profile.OnboardingCompleted {
				return &LearningPlanBundle{
					Profile:            profile,
					AssessmentRequired: true,
					AssessmentItems:    []model.LearningAssessmentItem{},
					Items:              []model.LearningPlanItem{},
				}, nil
			}
			return &LearningPlanBundle{
				Profile:                profile,
				AssessmentItems:        []model.LearningAssessmentItem{},
				Items:                  []model.LearningPlanItem{},
				PlanGenerationRequired: true,
			}, nil
		} else {
			return nil, err
		}
	}
	return &LearningPlanBundle{
		Profile:         profile,
		Plan:            plan,
		Items:           items,
		AssessmentItems: []model.LearningAssessmentItem{},
	}, nil
}

func (s *LearningPlanService) GeneratePlan(requestID string, userID uint) (*LearningPlanBundle, error) {
	profile, err := s.repo.GetLearningProfileByUser(requestID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("learning profile not found")
		}
		return nil, err
	}
	if !profile.OnboardingCompleted {
		return nil, errors.New("assessment is not completed")
	}
	if _, _, activeAssessmentErr := s.repo.GetLatestActiveLearningAssessment(requestID, userID); activeAssessmentErr == nil {
		return nil, errors.New("assessment is not completed")
	} else if !errors.Is(activeAssessmentErr, gorm.ErrRecordNotFound) {
		return nil, activeAssessmentErr
	}
	if _, _, planErr := s.repo.GetActiveLearningPlan(requestID, userID); planErr == nil {
		return s.GetCurrent(requestID, userID)
	} else if !errors.Is(planErr, gorm.ErrRecordNotFound) {
		return nil, planErr
	}
	if err := s.rebuildPlanForProfile(requestID, profile, nil); err != nil {
		return nil, err
	}
	return s.GetCurrent(requestID, userID)
}

func (s *LearningPlanService) SetGoal(requestID string, userID uint, params SetLearningGoalParams) (*LearningPlanBundle, error) {
	goal := strings.TrimSpace(params.Goal)
	if goal == "" {
		return nil, errors.New("goal is required")
	}
	dailyMinutes := params.DailyMinutes
	if dailyMinutes <= 0 {
		dailyMinutes = 20
	}
	studyTimeRange := strings.TrimSpace(params.StudyTimeRange)
	now := time.Now()
	dueDate := beginningOfDay(now)

	profile, err := s.repo.GetLearningProfileByUser(requestID, userID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if profile == nil || errors.Is(err, gorm.ErrRecordNotFound) {
		profile = &model.LearningProfile{
			UserID:                userID,
			Goal:                  goal,
			DailyMinutes:          dailyMinutes,
			StudyTimeRange:        studyTimeRange,
			TranslationMode:       translationModeZhToEn,
			Focuses:               model.StringList{"word", "sentence", "article"},
			WordLevel:             3,
			SentenceLevel:         3,
			OverallLevel:          3,
			OnboardingCompleted:   false,
			NextAssessmentType:    assessmentTypeInitial,
			NextAssessmentDueDate: &dueDate,
		}
	} else {
		profile.Goal = goal
		profile.DailyMinutes = dailyMinutes
		profile.StudyTimeRange = studyTimeRange
		profile.WordLevel = 3
		profile.SentenceLevel = 3
		profile.OverallLevel = 3
		profile.OnboardingCompleted = false
		profile.LastAssessmentAt = nil
		profile.NextAssessmentType = assessmentTypeInitial
		profile.NextAssessmentDueDate = &dueDate
	}

	if err := s.repo.ArchiveActiveLearningPlans(requestID, userID); err != nil {
		return nil, err
	}
	if err := s.repo.DeletePlanAutoModes(requestID, userID); err != nil {
		return nil, err
	}
	if err := s.repo.ArchiveActiveLearningAssessments(requestID, userID); err != nil {
		return nil, err
	}
	if err := s.repo.UpsertLearningProfile(requestID, profile); err != nil {
		return nil, err
	}
	return s.GetCurrent(requestID, userID)
}

func (s *LearningPlanService) SubmitAssessment(
	requestID string,
	userID uint,
	params SubmitLearningAssessmentParams,
) (*LearningPlanBundle, error) {
	assessment, items, err := s.repo.GetLatestActiveLearningAssessment(requestID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("assessment not found")
		}
		return nil, err
	}
	if assessment.ID != params.AssessmentID {
		return nil, errors.New("assessment not found")
	}
	profile, err := s.repo.GetLearningProfileByUser(requestID, userID)
	if err != nil {
		return nil, err
	}
	answerByID := make(map[uint]string, len(params.Answers))
	for _, item := range params.Answers {
		answerByID[item.ItemID] = strings.TrimSpace(item.UserAnswer)
	}
	wordScores := make([]int, 0, 5)
	sentenceScores := make([]int, 0, 5)
	batchItems := make([]BatchAssessmentAnalyzeItem, 0, len(items))
	now := time.Now()
	assessment.StartedAt = &now
	assessment.CompletedAt = &now
	assessment.Status = "completed"
	for index := range items {
		answer := answerByID[items[index].ID]
		if answer == "" {
			return nil, errors.New("all assessment answers are required")
		}
		items[index].UserAnswer = answer
		sourceLanguage, targetLanguage := translationLanguagePair(items[index].TranslationMode)
		batchItems = append(batchItems, BatchAssessmentAnalyzeItem{
			ItemID:          items[index].ID,
			StudyType:       items[index].StudyType,
			TranslationMode: items[index].TranslationMode,
			SourceLanguage:  sourceLanguage,
			TargetLanguage:  targetLanguage,
			Question:        items[index].Question,
			AnswerText:      answer,
			AnswerKey:       items[index].AnswerKey,
		})
	}

	resultsByID, err := s.questions.AnalyzeAssessmentBatch(requestID, batchItems)
	if err != nil {
		return nil, err
	}

	for index := range items {
		result, ok := resultsByID[items[index].ID]
		if !ok {
			return nil, fmt.Errorf("assessment result missing item %d", items[index].ID)
		}
		score := 100
		if len(result.Issues) > 0 {
			score = max(40, 100-len(result.Issues)*15)
		}
		items[index].Score = score
		if items[index].StudyType == studyTypeWord {
			wordScores = append(wordScores, score)
		} else {
			sentenceScores = append(sentenceScores, score)
		}
	}

	wordAvg := averageScore(wordScores)
	sentenceAvg := averageScore(sentenceScores)
	profile.WordLevel = resolveNextLevel(profile.WordLevel, wordAvg, assessment.AssessmentType)
	profile.SentenceLevel = resolveNextLevel(profile.SentenceLevel, sentenceAvg, assessment.AssessmentType)
	profile.OverallLevel = averageScore([]int{profile.WordLevel * 10, profile.SentenceLevel * 10}) / 10
	profile.OnboardingCompleted = true
	profile.LastAssessmentAt = &now
	profile.NextAssessmentType = ""
	profile.NextAssessmentDueDate = nil

	assessment.WordLevelAfter = profile.WordLevel
	assessment.SentenceLevelAfter = profile.SentenceLevel
	assessment.OverallLevelAfter = profile.OverallLevel

	if err := s.repo.CompleteLearningAssessment(requestID, assessment, items, profile); err != nil {
		return nil, err
	}
	return s.GetCurrent(requestID, userID)
}

func (s *LearningPlanService) isAssessmentDue(profile *model.LearningProfile) bool {
	if profile == nil {
		return false
	}
	if !profile.OnboardingCompleted {
		return true
	}
	if strings.TrimSpace(profile.NextAssessmentType) == "" || profile.NextAssessmentDueDate == nil {
		return false
	}
	return !profile.NextAssessmentDueDate.After(beginningOfDay(time.Now()))
}

func (s *LearningPlanService) createAssessmentForProfile(
	requestID string,
	profile *model.LearningProfile,
) (*model.LearningAssessment, []model.LearningAssessmentItem, error) {
	assessmentType := profile.NextAssessmentType
	if strings.TrimSpace(assessmentType) == "" {
		assessmentType = assessmentTypeInitial
	}
	triggerReason := assessmentTriggerOnboarding
	switch assessmentType {
	case assessmentTypeUpgrade:
		triggerReason = assessmentTriggerUpgrade
	case assessmentTypeDowngrade:
		triggerReason = assessmentTriggerDowngrade
	}
	wordLevel := adjustedAssessmentLevel(profile.WordLevel, assessmentType)
	sentenceLevel := adjustedAssessmentLevel(profile.SentenceLevel, assessmentType)
	wordQuestions, err := s.questions.GenerateDirectQuestions(
		requestID,
		wordLevel,
		5,
		studyTypeWord,
		profile.TranslationMode,
		[]string{
			fmt.Sprintf("本轮是%s，目标：%s", assessmentTypeLabel(assessmentType), profile.Goal),
			"请优先考察核心词义、固定搭配与常见误用，不要输出句子。",
		},
	)
	if err != nil {
		return nil, nil, err
	}
	sentenceQuestions, err := s.questions.GenerateDirectQuestions(
		requestID,
		sentenceLevel,
		5,
		studyTypeSentence,
		profile.TranslationMode,
		[]string{
			fmt.Sprintf("本轮是%s，目标：%s", assessmentTypeLabel(assessmentType), profile.Goal),
			"请优先考察真实表达、时态、语法和自然度，只输出单句。",
		},
	)
	if err != nil {
		return nil, nil, err
	}

	assessment := &model.LearningAssessment{
		UserID:              profile.UserID,
		ProfileID:           profile.ID,
		AssessmentType:      assessmentType,
		TriggerReason:       triggerReason,
		Status:              "pending",
		WordLevelBefore:     profile.WordLevel,
		SentenceLevelBefore: profile.SentenceLevel,
		WordLevelAfter:      profile.WordLevel,
		SentenceLevelAfter:  profile.SentenceLevel,
		OverallLevelAfter:   profile.OverallLevel,
	}
	items := make([]model.LearningAssessmentItem, 0, len(wordQuestions)+len(sentenceQuestions))
	for _, item := range wordQuestions {
		items = append(items, model.LearningAssessmentItem{
			StudyType:       studyTypeWord,
			TranslationMode: profile.TranslationMode,
			Level:           wordLevel,
			Question:        item.Question,
			AnswerKey:       item.AnswerKey,
		})
	}
	for _, item := range sentenceQuestions {
		items = append(items, model.LearningAssessmentItem{
			StudyType:       studyTypeSentence,
			TranslationMode: profile.TranslationMode,
			Level:           sentenceLevel,
			Question:        item.Question,
			AnswerKey:       item.AnswerKey,
		})
	}
	if err := s.repo.CreateLearningAssessment(requestID, assessment, items); err != nil {
		return nil, nil, err
	}
	return s.repo.GetLatestActiveLearningAssessment(requestID, profile.UserID)
}

func (s *LearningPlanService) rebuildPlanForProfile(
	requestID string,
	profile *model.LearningProfile,
	assessmentID *uint,
) error {
	if err := s.repo.ArchiveActiveLearningPlans(requestID, profile.UserID); err != nil {
		return err
	}
	if err := s.repo.DeletePlanAutoModes(requestID, profile.UserID); err != nil {
		return err
	}
	items, modes := buildPlan(profile)
	version, err := s.repo.GetLatestLearningPlanVersion(requestID, profile.UserID)
	if err != nil {
		return err
	}
	plan := &model.LearningPlan{
		UserID:       profile.UserID,
		ProfileID:    profile.ID,
		AssessmentID: assessmentID,
		Title:        buildPlanTitle(profile),
		GoalSummary:  buildPlanSummary(profile),
		Status:       "active",
		Version:      version + 1,
		PlanDate:     beginningOfDay(time.Now()),
	}
	return s.repo.CreateLearningPlan(requestID, plan, items, modes)
}

func buildPlan(profile *model.LearningProfile) ([]model.LearningPlanItem, []model.Mode) {
	type planTemplate struct {
		studyType int
		name      string
		desc      string
		numbers   int
		minutes   int
		order     int
	}
	templates := []planTemplate{
		{studyType: studyTypeWord, name: "单词能力训练", desc: "围绕目标补足高频词义、词组和固定搭配。", numbers: 6, minutes: 10, order: 1},
		{studyType: studyTypeSentence, name: "句子表达训练", desc: "强化句子翻译、语法和自然表达。", numbers: 5, minutes: 12, order: 2},
		{studyType: studyTypeArticle, name: "文章理解训练", desc: "用较长英文内容巩固理解和输出耐力。", numbers: 1, minutes: 18, order: 3},
	}
	items := make([]model.LearningPlanItem, 0, len(templates))
	modes := make([]model.Mode, 0, len(templates))
	for _, tpl := range templates {
		level := planLevelForStudyType(profile, tpl.studyType)
		numbers := tpl.numbers
		if tpl.studyType != studyTypeArticle && profile.DailyMinutes >= 30 {
			numbers++
		}
		requirements := []string{
			"题目必须自然、实用、贴近真实英语场景",
			fmt.Sprintf("目标：%s", profile.Goal),
		}
		if tpl.studyType == studyTypeWord {
			requirements = append(requirements, fmt.Sprintf("当前单词能力 Level %d，请重点覆盖易错点和高频表达", profile.WordLevel))
		} else if tpl.studyType == studyTypeSentence {
			requirements = append(requirements, fmt.Sprintf("当前句子能力 Level %d，请重点覆盖语法、搭配和自然度", profile.SentenceLevel))
		} else {
			requirements = append(requirements, fmt.Sprintf("整体能力 Level %d，文章长度和逻辑复杂度与之匹配", profile.OverallLevel))
		}
		item := model.LearningPlanItem{
			Name:            tpl.name,
			Description:     tpl.desc,
			StudyType:       tpl.studyType,
			TranslationMode: profile.TranslationMode,
			Level:           level,
			Numbers:         numbers,
			EstimatedMin:    tpl.minutes,
			Requirements:    model.StringList(requirements),
			SortOrder:       tpl.order,
			Status:          "active",
		}
		mode := model.Mode{
			Name:         tpl.name,
			Description:  fmt.Sprintf("%s 目标：%s", tpl.desc, profile.Goal),
			Level:        level,
			Numbers:      numbers,
			Type:         tpl.studyType,
			Mode:         profile.TranslationMode,
			Source:       modeSourcePlanAuto,
			Requirements: model.StringList(requirements),
		}
		items = append(items, item)
		modes = append(modes, mode)
	}
	return items, modes
}

func buildPlanTitle(profile *model.LearningProfile) string {
	return fmt.Sprintf("%s · 自适应训练计划", profile.Goal)
}

func buildPlanSummary(profile *model.LearningProfile) string {
	timeRange := strings.TrimSpace(profile.StudyTimeRange)
	if timeRange == "" {
		timeRange = "时间段待定"
	}
	return fmt.Sprintf(
		"目标：%s。每天学习 %d 分钟，时间段：%s。单词 Level %d，句子 Level %d，综合 Level %d。",
		profile.Goal,
		profile.DailyMinutes,
		timeRange,
		profile.WordLevel,
		profile.SentenceLevel,
		profile.OverallLevel,
	)
}

func planLevelForStudyType(profile *model.LearningProfile, studyType int) int {
	switch studyType {
	case studyTypeWord:
		return clamp(profile.WordLevel, 1, 10)
	case studyTypeSentence:
		return clamp(profile.SentenceLevel, 1, 10)
	case studyTypeArticle:
		return clamp(max(profile.SentenceLevel, profile.OverallLevel), 1, 10)
	default:
		return clamp(profile.OverallLevel, 1, 10)
	}
}

func adjustedAssessmentLevel(currentLevel int, assessmentType string) int {
	switch assessmentType {
	case assessmentTypeUpgrade:
		return clamp(currentLevel+1, 1, 10)
	case assessmentTypeDowngrade:
		return clamp(currentLevel-1, 1, 10)
	default:
		return clamp(currentLevel, 1, 10)
	}
}

func resolveNextLevel(currentLevel, averageScore int, assessmentType string) int {
	switch assessmentType {
	case assessmentTypeUpgrade:
		if averageScore >= 90 {
			return clamp(currentLevel+1, 1, 10)
		}
		return currentLevel
	case assessmentTypeDowngrade:
		if averageScore < 70 {
			return clamp(currentLevel-1, 1, 10)
		}
		return currentLevel
	default:
		if averageScore >= 90 {
			return clamp(currentLevel+1, 1, 10)
		}
		if averageScore < 70 {
			return clamp(currentLevel-1, 1, 10)
		}
		return currentLevel
	}
}

func assessmentTypeLabel(value string) string {
	switch value {
	case assessmentTypeUpgrade:
		return "提高难度测试"
	case assessmentTypeDowngrade:
		return "降低难度测试"
	default:
		return "初始水平测试"
	}
}

func averageScore(values []int) int {
	if len(values) == 0 {
		return 0
	}
	total := 0
	for _, value := range values {
		total += value
	}
	return total / len(values)
}

func beginningOfDay(value time.Time) time.Time {
	return time.Date(value.Year(), value.Month(), value.Day(), 0, 0, 0, 0, value.Location())
}

func clamp(value, minValue, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
