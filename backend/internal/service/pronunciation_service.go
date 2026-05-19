package service

import (
	"errors"
	"net/url"
	"regexp"
	"strings"

	"study_english/backend/internal/model"
)

var englishTextPattern = regexp.MustCompile(`[A-Za-z]`)

// PronunciationService builds English-only Google pronunciation resources.
type PronunciationService struct{}

// NewPronunciationService creates pronunciation service.
func NewPronunciationService() *PronunciationService { return &PronunciationService{} }

func (s *PronunciationService) Build(text string, lang string) (*model.Pronunciation, error) {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return nil, errors.New("text is required")
	}
	if lang != "en" {
		return nil, errors.New("only english pronunciation is supported")
	}
	if !englishTextPattern.MatchString(trimmed) {
		return nil, errors.New("text does not contain english content")
	}
	return &model.Pronunciation{
		Text:     trimmed,
		Lang:     "en",
		AudioURL: "/api/v1/pronunciations/stream?lang=en&text=" + url.QueryEscape(trimmed),
		Provider: "google",
	}, nil
}

func (s *PronunciationService) TryBuildEnglish(text string) *model.Pronunciation {
	item, err := s.Build(text, "en")
	if err != nil {
		return nil
	}
	return item
}

func (s *PronunciationService) GoogleTTSURL(text string, lang string) (string, error) {
	item, err := s.Build(text, lang)
	if err != nil {
		return "", err
	}
	return "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" + item.Lang + "&q=" + url.QueryEscape(item.Text), nil
}
