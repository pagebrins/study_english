package service

import (
	"errors"

	"study_english/backend/internal/model"
	"study_english/backend/internal/repository"
)

type PermissionSnapshot struct {
	Roles           []model.Role           `json:"roles"`
	Permissions     []model.Permission     `json:"permissions"`
	RolePermissions []model.RolePermission `json:"role_permissions"`
}

// PermissionService handles RBAC settings.
type PermissionService struct {
	repo *repository.Repository
}

// NewPermissionService creates service.
func NewPermissionService(repo *repository.Repository) *PermissionService {
	return &PermissionService{repo: repo}
}

func (s *PermissionService) Snapshot(requestID string) (*PermissionSnapshot, error) {
	roles, err := s.repo.ListRoles(requestID)
	if err != nil {
		return nil, err
	}
	permissions, err := s.repo.ListPermissions(requestID)
	if err != nil {
		return nil, err
	}
	rolePermissions, err := s.repo.ListRolePermissions(requestID)
	if err != nil {
		return nil, err
	}
	return &PermissionSnapshot{
		Roles:           roles,
		Permissions:     permissions,
		RolePermissions: rolePermissions,
	}, nil
}

func (s *PermissionService) ListUserRoles(requestID string) ([]model.UserRoleView, error) {
	return s.repo.ListUserRoles(requestID)
}

func (s *PermissionService) UpdateUserRole(requestID string, userID, roleID uint) error {
	if _, err := s.repo.GetUserByID(requestID, userID); err != nil {
		return errors.New("user not found")
	}
	if _, err := s.repo.GetRoleByID(requestID, roleID); err != nil {
		return errors.New("role not found")
	}
	return s.repo.UpsertUserRole(requestID, userID, roleID)
}

func (s *PermissionService) UpdateRolePermissions(requestID string, roleID uint, permissionIDs []uint) error {
	if _, err := s.repo.GetRoleByID(requestID, roleID); err != nil {
		return errors.New("role not found")
	}
	availablePermissions, err := s.repo.ListPermissions(requestID)
	if err != nil {
		return err
	}
	allowed := make(map[uint]struct{}, len(availablePermissions))
	for _, permission := range availablePermissions {
		allowed[permission.ID] = struct{}{}
	}
	for _, permissionID := range permissionIDs {
		if _, ok := allowed[permissionID]; !ok {
			return errors.New("permission not found")
		}
	}
	return s.repo.ReplaceRolePermissions(requestID, roleID, permissionIDs)
}
