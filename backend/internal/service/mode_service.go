package service

import (
	"errors"
	"fmt"
	"strings"
	"study_english/backend/internal/model"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/repository"

	"go.uber.org/zap"
)

// ModeService handles mode business logic.
type ModeService struct {
	repo *repository.Repository
}

const (
	maxModeRequirements     = 3
	maxModeRequirementChars = 200
	minModeType             = 1
	maxModeType             = 3
	minTranslationMode      = 1
	maxTranslationMode      = 2
	minThemeLevel           = 1
	maxThemeLevel           = 3
)

// NewModeService creates mode service.
func NewModeService(repo *repository.Repository) *ModeService { return &ModeService{repo: repo} }

func (s *ModeService) List(requestID string, userID uint, studyType *int, translationMode *int) ([]model.Mode, error) {
	return s.repo.ListModes(requestID, userID, studyType, translationMode)
}

func (s *ModeService) Create(requestID string, mode *model.Mode) error {
	if mode.Level < 1 || mode.Level > 10 {
		logger.L().Error("mode create validation failed", zap.String("request_id", requestID))
		return errors.New("level must be between 1 and 10")
	}
	if mode.Type < minModeType || mode.Type > maxModeType {
		logger.L().Error("mode create type validation failed", zap.String("request_id", requestID))
		return errors.New("type must be 1(word), 2(sentence), or 3(article)")
	}
	if mode.Mode < minTranslationMode || mode.Mode > maxTranslationMode {
		logger.L().Error("mode create translation mode validation failed", zap.String("request_id", requestID))
		return errors.New("mode must be 1(zh->en) or 2(en->zh)")
	}
	if err := s.validateThemeID(requestID, mode.ThemeID); err != nil {
		logger.L().Error("mode create theme validation failed", zap.String("request_id", requestID), zap.Error(err))
		return err
	}
	requirements, err := normalizeRequirements(mode.Requirements)
	if err != nil {
		logger.L().Error("mode create requirements validation failed", zap.String("request_id", requestID), zap.Error(err))
		return err
	}
	mode.Requirements = requirements
	return s.repo.CreateMode(requestID, mode)
}

func (s *ModeService) Update(requestID string, mode *model.Mode) error {
	if mode.Level < 1 || mode.Level > 10 {
		logger.L().Error("mode update validation failed", zap.String("request_id", requestID))
		return errors.New("level must be between 1 and 10")
	}
	if mode.Type < minModeType || mode.Type > maxModeType {
		logger.L().Error("mode update type validation failed", zap.String("request_id", requestID))
		return errors.New("type must be 1(word), 2(sentence), or 3(article)")
	}
	if mode.Mode < minTranslationMode || mode.Mode > maxTranslationMode {
		logger.L().Error("mode update translation mode validation failed", zap.String("request_id", requestID))
		return errors.New("mode must be 1(zh->en) or 2(en->zh)")
	}
	if err := s.validateThemeID(requestID, mode.ThemeID); err != nil {
		logger.L().Error("mode update theme validation failed", zap.String("request_id", requestID), zap.Error(err))
		return err
	}
	requirements, err := normalizeRequirements(mode.Requirements)
	if err != nil {
		logger.L().Error("mode update requirements validation failed", zap.String("request_id", requestID), zap.Error(err))
		return err
	}
	mode.Requirements = requirements
	return s.repo.UpdateMode(requestID, mode)
}

func (s *ModeService) Delete(requestID string, id, userID uint) error {
	return s.repo.DeleteMode(requestID, id, userID)
}

func normalizeRequirements(input model.StringList) (model.StringList, error) {
	if len(input) == 0 {
		return model.StringList{}, nil
	}
	normalized := make([]string, 0, len(input))
	for _, item := range input {
		trimmed := strings.TrimSpace(item)
		if trimmed == "" {
			return nil, errors.New("requirement cannot be empty")
		}
		if len([]rune(trimmed)) > maxModeRequirementChars {
			return nil, fmt.Errorf("requirement length must be <= %d characters", maxModeRequirementChars)
		}
		normalized = append(normalized, trimmed)
	}
	if len(normalized) > maxModeRequirements {
		return nil, fmt.Errorf("requirements must be <= %d items", maxModeRequirements)
	}
	return model.StringList(normalized), nil
}

func (s *ModeService) validateThemeID(requestID string, themeID *uint) error {
	if themeID == nil {
		return nil
	}
	theme, err := s.repo.GetThemeByID(requestID, *themeID)
	if err != nil {
		return errors.New("theme not found")
	}
	if theme.Level < minThemeLevel || theme.Level > maxThemeLevel {
		return errors.New("theme level must be 1, 2, or 3")
	}
	if theme.Level == minThemeLevel && theme.ParentID != nil {
		return errors.New("level 1 theme cannot have parent")
	}
	if theme.Level > minThemeLevel && theme.ParentID == nil {
		return errors.New("level 2/3 theme must have parent")
	}
	return nil
}
