package service

import (
	"errors"
	"strings"

	"study_english/backend/internal/model"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/repository"

	"go.uber.org/zap"
)

const (
	themeLevelOne   = 1
	themeLevelTwo   = 2
	themeLevelThree = 3
)

// ThemeService handles global theme CRUD.
type ThemeService struct {
	repo *repository.Repository
}

// NewThemeService creates theme service.
func NewThemeService(repo *repository.Repository) *ThemeService { return &ThemeService{repo: repo} }

func (s *ThemeService) List(requestID string, parentID *uint, level *int, all bool) ([]model.Theme, error) {
	if level != nil && (*level < themeLevelOne || *level > themeLevelThree) {
		return nil, errors.New("level must be 1, 2, or 3")
	}
	if all {
		return s.repo.ListAllThemes(requestID)
	}
	return s.repo.ListThemes(requestID, parentID, level)
}

func (s *ThemeService) Create(requestID string, theme *model.Theme) error {
	if err := s.validateTheme(requestID, theme, true); err != nil {
		return err
	}
	return s.repo.CreateTheme(requestID, theme)
}

func (s *ThemeService) Update(requestID string, theme *model.Theme) error {
	if err := s.validateTheme(requestID, theme, false); err != nil {
		return err
	}
	return s.repo.UpdateTheme(requestID, theme)
}

func (s *ThemeService) Delete(requestID string, id uint) error {
	children, err := s.repo.CountThemeChildren(requestID, id)
	if err != nil {
		return err
	}
	if children > 0 {
		return errors.New("cannot delete theme with children")
	}
	usedByMode, err := s.repo.CountModesByTheme(requestID, id)
	if err != nil {
		return err
	}
	if usedByMode > 0 {
		return errors.New("cannot delete theme used by modes")
	}
	return s.repo.DeleteTheme(requestID, id)
}

func (s *ThemeService) validateTheme(requestID string, theme *model.Theme, isCreate bool) error {
	theme.Name = strings.TrimSpace(theme.Name)
	if theme.Name == "" {
		return errors.New("name is required")
	}
	if len([]rune(theme.Name)) > 120 {
		return errors.New("name length must be <= 120")
	}
	if theme.Level < themeLevelOne || theme.Level > themeLevelThree {
		return errors.New("level must be 1, 2, or 3")
	}

	switch theme.Level {
	case themeLevelOne:
		theme.ParentID = nil
	case themeLevelTwo:
		if theme.ParentID == nil {
			return errors.New("level 2 theme requires level 1 parent")
		}
		parent, err := s.repo.GetThemeByID(requestID, *theme.ParentID)
		if err != nil {
			return errors.New("parent theme not found")
		}
		if parent.Level != themeLevelOne {
			return errors.New("level 2 theme requires level 1 parent")
		}
	case themeLevelThree:
		if theme.ParentID == nil {
			return errors.New("level 3 theme requires level 2 parent")
		}
		parent, err := s.repo.GetThemeByID(requestID, *theme.ParentID)
		if err != nil {
			return errors.New("parent theme not found")
		}
		if parent.Level != themeLevelTwo {
			return errors.New("level 3 theme requires level 2 parent")
		}
	}

	if !isCreate && theme.ID > 0 && theme.ParentID != nil && *theme.ParentID == theme.ID {
		return errors.New("theme parent cannot be itself")
	}

	if theme.SortOrder < 0 {
		logger.L().Warn("theme sort order is negative, reset to 0", zap.String("request_id", requestID))
		theme.SortOrder = 0
	}
	exists, err := s.repo.ExistsThemeByNameAndLevel(requestID, theme.Name, theme.Level, theme.ID)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("theme with same name and level already exists")
	}
	return nil
}
