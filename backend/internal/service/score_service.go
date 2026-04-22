package service

import (
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/repository"
	"time"

	"go.uber.org/zap"
)

// TodayScore is daily score payload.
type TodayScore struct {
	Score    int `json:"score"`
	Total    int `json:"total"`
	Answered int `json:"answered"`
}

// ScoreService handles score logic.
type ScoreService struct {
	repo *repository.Repository
}

// NewScoreService creates score service.
func NewScoreService(repo *repository.Repository) *ScoreService { return &ScoreService{repo: repo} }

func (s *ScoreService) Today(requestID string, userID uint, studyType *int, translationMode *int) (TodayScore, error) {
	logger.L().Info("score calculate today", zap.String("request_id", requestID), zap.Uint("user_id", userID))
	now := time.Now()
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dayEnd := dayStart.Add(24 * time.Hour)
	questions, err := s.repo.ListTodayQuestions(requestID, userID, dayStart, dayEnd, studyType, translationMode)
	if err != nil {
		logger.L().Error("score calculate today failed", zap.String("request_id", requestID), zap.Error(err))
		return TodayScore{}, err
	}
	if len(questions) == 0 {
		return TodayScore{Score: 0, Total: 100, Answered: 0}, nil
	}
	total := 0
	for _, q := range questions {
		total += q.Score
	}
	avg := total / len(questions)
	if avg > 100 {
		avg = 100
	}
	if avg < 0 {
		avg = 0
	}
	return TodayScore{Score: avg, Total: 100, Answered: len(questions)}, nil
}
