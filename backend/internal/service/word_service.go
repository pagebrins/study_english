package service

import (
	"errors"
	"strings"

	"study_english/backend/internal/model"
	"study_english/backend/internal/repository"
)

// WordService handles word knowledge base CRUD.
type WordService struct {
	repo *repository.Repository
}

// NewWordService creates word service.
func NewWordService(repo *repository.Repository) *WordService { return &WordService{repo: repo} }

func (s *WordService) List(requestID string, word, l1Category, l2Category, tag *string) ([]model.Word, error) {
	items, err := s.repo.ListWords(requestID, word, l1Category, l2Category, tag)
	if err != nil {
		return nil, err
	}
	enrichWordsWithPronunciation(items)
	return items, nil
}

func (s *WordService) Create(requestID string, word *model.Word) error {
	if err := s.validateWord(requestID, word, true); err != nil {
		return err
	}
	return s.repo.CreateWord(requestID, word)
}

func (s *WordService) Update(requestID string, word *model.Word) error {
	if _, err := s.repo.GetWordByID(requestID, word.ID); err != nil {
		return errors.New("word not found")
	}
	if err := s.validateWord(requestID, word, false); err != nil {
		return err
	}
	return s.repo.UpdateWord(requestID, word)
}

func (s *WordService) Delete(requestID string, id uint) error {
	if _, err := s.repo.GetWordByID(requestID, id); err != nil {
		return errors.New("word not found")
	}
	return s.repo.DeleteWord(requestID, id)
}

func (s *WordService) validateWord(requestID string, word *model.Word, isCreate bool) error {
	word.Word = strings.TrimSpace(word.Word)
	word.Definition = strings.TrimSpace(word.Definition)
	word.L1Category = strings.TrimSpace(word.L1Category)
	word.L2Category = strings.TrimSpace(word.L2Category)
	word.Example = strings.TrimSpace(word.Example)

	if word.Word == "" {
		return errors.New("word is required")
	}
	if word.Definition == "" {
		return errors.New("definition is required")
	}
	if word.L1Category == "" {
		return errors.New("l1_category is required")
	}
	if len([]rune(word.Word)) > 120 {
		return errors.New("word length must be <= 120")
	}
	if len([]rune(word.L1Category)) > 120 || len([]rune(word.L2Category)) > 120 {
		return errors.New("category length must be <= 120")
	}

	exists, err := s.repo.ExistsWord(requestID, word.Word, word.L1Category, word.L2Category, word.ID)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("word already exists in the selected category")
	}

	normalizedTags := make([]model.WordTag, 0, len(word.Tags))
	seen := map[string]struct{}{}
	for index, tag := range word.Tags {
		tag.CategoryName = strings.TrimSpace(tag.CategoryName)
		if tag.CategoryName == "" {
			continue
		}
		if len([]rune(tag.CategoryName)) > 120 {
			return errors.New("tag name length must be <= 120")
		}
		if tag.CategoryID == 0 {
			tag.CategoryID = uint(index + 1)
		}
		key := strings.ToLower(tag.CategoryName)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		normalizedTags = append(normalizedTags, model.WordTag{
			ID:           tag.ID,
			WordID:       tag.WordID,
			CategoryID:   tag.CategoryID,
			CategoryName: tag.CategoryName,
		})
	}
	word.Tags = normalizedTags

	if isCreate {
		word.ID = 0
	}
	return nil
}
