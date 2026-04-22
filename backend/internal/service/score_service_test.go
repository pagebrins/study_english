package service

import (
	"testing"
	"time"

	"study_english/backend/internal/model"
	"study_english/backend/internal/pkg/db"
	"study_english/backend/internal/repository"
)

func TestTodayScore(t *testing.T) {
	database, err := db.New("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	repo := repository.New(database)
	user := &model.User{Email: "u@test.com", Name: "U", PasswordHash: "x"}
	if err := repo.CreateUser("-", user); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}
	question := &model.UserQuestion{
		UserID:     user.ID,
		ModeID:     1,
		Question:   "q",
		AnswerKey:  "k",
		AnswerText: "a",
		Score:      80,
		CreateTime: time.Now(),
	}
	if err := repo.CreateQuestion("-", question); err != nil {
		t.Fatalf("failed to create question: %v", err)
	}
	service := NewScoreService(repo)
	score, err := service.Today("-", user.ID, nil, nil)
	if err != nil {
		t.Fatalf("today score failed: %v", err)
	}
	if score.Score != 80 || score.Answered != 1 {
		t.Fatalf("unexpected score result: %+v", score)
	}
}
