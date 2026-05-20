package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"study_english/backend/internal/model"
)

var englishTextPattern = regexp.MustCompile(`[A-Za-z]`)

// PronunciationService builds English-only Google pronunciation resources.
type PronunciationService struct {
	client *http.Client
}

// NewPronunciationService creates pronunciation service.
func NewPronunciationService() *PronunciationService {
	return &PronunciationService{
		client: &http.Client{Timeout: 20 * time.Second},
	}
}

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

func (s *PronunciationService) FetchAudio(ctx context.Context, text string, lang string) (io.ReadCloser, string, int64, error) {
	audioURL, err := s.GoogleTTSURL(text, lang)
	if err != nil {
		return nil, "", 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, audioURL, nil)
	if err != nil {
		return nil, "", 0, err
	}

	// Use a browser-like UA because Google Translate TTS is stricter with
	// generic media/embed requests than with normal browser fetches.
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "audio/mpeg,audio/*;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Referer", "https://translate.google.com/")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, "", 0, err
	}

	if resp.StatusCode != http.StatusOK {
		defer resp.Body.Close()
		return nil, "", 0, fmt.Errorf("tts upstream returned status %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "audio/mpeg"
	}

	return resp.Body, contentType, resp.ContentLength, nil
}
