package repository

import (
	"strings"
	"study_english/backend/internal/model"
	"study_english/backend/internal/pkg/authz"
	"study_english/backend/internal/pkg/logger"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Repository wraps all db operations.
type Repository struct {
	db *gorm.DB
}

// New creates repository.
func New(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateUser(requestID string, user *model.User) error {
	logger.L().Info("db create user", zap.String("request_id", requestID), zap.String("email", user.Email))
	err := r.db.Create(user).Error
	if err != nil {
		logger.L().Error("db create user failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}
func (r *Repository) GetUserByEmail(requestID, email string) (*model.User, error) {
	logger.L().Info("db get user by email", zap.String("request_id", requestID), zap.String("email", email))
	var user model.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		logger.L().Error("db get user by email failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return &user, nil
}
func (r *Repository) GetUserByID(requestID string, id uint) (*model.User, error) {
	logger.L().Info("db get user by id", zap.String("request_id", requestID), zap.Uint("user_id", id))
	var user model.User
	if err := r.db.First(&user, id).Error; err != nil {
		logger.L().Error("db get user by id failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return &user, nil
}

func (r *Repository) UpdateUserPasswordByEmail(requestID, email, passwordHash string) error {
	logger.L().Info("db update user password by email", zap.String("request_id", requestID), zap.String("email", email))
	result := r.db.Model(&model.User{}).Where("email = ?", email).Update("password_hash", passwordHash)
	if result.Error != nil {
		logger.L().Error("db update user password by email failed", zap.String("request_id", requestID), zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *Repository) EnsureRBACSeed(requestID string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for _, roleSeed := range authz.DefaultRoleSeeds {
			var role model.Role
			if err := tx.Where("code = ?", roleSeed.Code).First(&role).Error; err != nil {
				if err != gorm.ErrRecordNotFound {
					return err
				}
				role = model.Role{
					Code:        roleSeed.Code,
					Name:        roleSeed.Name,
					Description: roleSeed.Description,
				}
				if err := tx.Create(&role).Error; err != nil {
					return err
				}
			}
		}
		for _, permSeed := range authz.DefaultPermissionSeeds {
			var permission model.Permission
			if err := tx.Where("code = ?", permSeed.Code).First(&permission).Error; err != nil {
				if err != gorm.ErrRecordNotFound {
					return err
				}
				permission = model.Permission{
					Code:        permSeed.Code,
					Name:        permSeed.Name,
					Description: permSeed.Description,
				}
				if err := tx.Create(&permission).Error; err != nil {
					return err
				}
			}
		}
		for roleCode, permissionCodes := range authz.DefaultRolePermissionCodes {
			var role model.Role
			if err := tx.Where("code = ?", roleCode).First(&role).Error; err != nil {
				return err
			}
			var permissions []model.Permission
			if err := tx.Where("code IN ?", permissionCodes).Find(&permissions).Error; err != nil {
				return err
			}
			for _, permission := range permissions {
				var count int64
				if err := tx.Model(&model.RolePermission{}).
					Where("role_id = ? AND permission_id = ?", role.ID, permission.ID).
					Count(&count).Error; err != nil {
					return err
				}
				if count == 0 {
					if err := tx.Create(&model.RolePermission{
						RoleID:       role.ID,
						PermissionID: permission.ID,
					}).Error; err != nil {
						return err
					}
				}
			}
		}
		var guestRole model.Role
		if err := tx.Where("code = ?", authz.RoleGuest).First(&guestRole).Error; err != nil {
			return err
		}
		var users []model.User
		if err := tx.Find(&users).Error; err != nil {
			return err
		}
		for _, user := range users {
			var count int64
			if err := tx.Model(&model.UserRole{}).Where("user_id = ?", user.ID).Count(&count).Error; err != nil {
				return err
			}
			if count == 0 {
				if err := tx.Create(&model.UserRole{
					UserID: user.ID,
					RoleID: guestRole.ID,
				}).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func (r *Repository) GetRoleByCode(requestID, code string) (*model.Role, error) {
	var role model.Role
	if err := r.db.Where("code = ?", code).First(&role).Error; err != nil {
		logger.L().Error("db get role by code failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return &role, nil
}

func (r *Repository) GetRoleByID(requestID string, id uint) (*model.Role, error) {
	var role model.Role
	if err := r.db.First(&role, id).Error; err != nil {
		logger.L().Error("db get role by id failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return &role, nil
}

func (r *Repository) ListRoles(requestID string) ([]model.Role, error) {
	var roles []model.Role
	if err := r.db.Order("id asc").Find(&roles).Error; err != nil {
		logger.L().Error("db list roles failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return roles, nil
}

func (r *Repository) ListPermissions(requestID string) ([]model.Permission, error) {
	var permissions []model.Permission
	if err := r.db.Order("id asc").Find(&permissions).Error; err != nil {
		logger.L().Error("db list permissions failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return permissions, nil
}

func (r *Repository) ListRolePermissions(requestID string) ([]model.RolePermission, error) {
	var items []model.RolePermission
	if err := r.db.Order("id asc").Find(&items).Error; err != nil {
		logger.L().Error("db list role permissions failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return items, nil
}

func (r *Repository) ReplaceRolePermissions(requestID string, roleID uint, permissionIDs []uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("role_id = ?", roleID).Delete(&model.RolePermission{}).Error; err != nil {
			return err
		}
		if len(permissionIDs) == 0 {
			return nil
		}
		items := make([]model.RolePermission, 0, len(permissionIDs))
		for _, permissionID := range permissionIDs {
			items = append(items, model.RolePermission{
				RoleID:       roleID,
				PermissionID: permissionID,
			})
		}
		if err := tx.Create(&items).Error; err != nil {
			logger.L().Error("db replace role permissions failed", zap.String("request_id", requestID), zap.Error(err))
			return err
		}
		return nil
	})
}

func (r *Repository) UpsertUserRole(requestID string, userID, roleID uint) error {
	var existing model.UserRole
	err := r.db.Where("user_id = ?", userID).First(&existing).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		logger.L().Error("db get user role failed", zap.String("request_id", requestID), zap.Error(err))
		return err
	}
	if err == gorm.ErrRecordNotFound {
		return r.db.Create(&model.UserRole{
			UserID: userID,
			RoleID: roleID,
		}).Error
	}
	return r.db.Model(&model.UserRole{}).Where("user_id = ?", userID).Update("role_id", roleID).Error
}

func (r *Repository) ListUserRoles(requestID string) ([]model.UserRoleView, error) {
	var items []model.UserRoleView
	err := r.db.Table("users u").
		Select("u.id AS user_id, u.email, u.name, r.id AS role_id, r.code AS role_code, r.name AS role_name").
		Joins("LEFT JOIN user_roles ur ON ur.user_id = u.id").
		Joins("LEFT JOIN roles r ON r.id = ur.role_id").
		Order("u.id asc").
		Scan(&items).Error
	if err != nil {
		logger.L().Error("db list user roles failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return items, nil
}

func (r *Repository) GetUserRole(requestID string, userID uint) (*model.Role, error) {
	var role model.Role
	err := r.db.Table("roles r").
		Select("r.*").
		Joins("JOIN user_roles ur ON ur.role_id = r.id").
		Where("ur.user_id = ?", userID).
		Limit(1).
		Scan(&role).Error
	if err != nil {
		logger.L().Error("db get user role failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	if role.ID == 0 {
		return r.GetRoleByCode(requestID, authz.RoleGuest)
	}
	return &role, nil
}

func (r *Repository) ListUserPermissionCodes(requestID string, userID uint) ([]string, error) {
	var role model.Role
	err := r.db.Table("roles r").
		Select("r.*").
		Joins("JOIN user_roles ur ON ur.role_id = r.id").
		Where("ur.user_id = ?", userID).
		Limit(1).
		Scan(&role).Error
	if err != nil {
		logger.L().Error("db list user permission codes failed get role", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	if role.ID == 0 {
		fallbackRole, roleErr := r.GetRoleByCode(requestID, authz.RoleGuest)
		if roleErr != nil {
			return nil, roleErr
		}
		role = *fallbackRole
	}
	var codes []string
	if err := r.db.Table("permissions p").
		Select("p.code").
		Joins("JOIN role_permissions rp ON rp.permission_id = p.id").
		Where("rp.role_id = ?", role.ID).
		Order("p.id asc").
		Pluck("p.code", &codes).Error; err != nil {
		logger.L().Error("db list user permission codes failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return codes, nil
}

func (r *Repository) CreateMode(requestID string, mode *model.Mode) error {
	logger.L().Info("db create mode", zap.String("request_id", requestID), zap.Uint("user_id", mode.UserID))
	err := r.db.Create(mode).Error
	if err != nil {
		logger.L().Error("db create mode failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}
func (r *Repository) ListModes(requestID string, userID uint, studyType *int, translationMode *int) ([]model.Mode, error) {
	logger.L().Info("db list modes", zap.String("request_id", requestID), zap.Uint("user_id", userID))
	var modes []model.Mode
	query := r.db.Where("user_id = ?", userID)
	if studyType != nil {
		query = query.Where("type = ?", *studyType)
	}
	if translationMode != nil {
		query = query.Where("mode = ?", *translationMode)
	}
	err := query.Order("id desc").Find(&modes).Error
	if err != nil {
		logger.L().Error("db list modes failed", zap.String("request_id", requestID), zap.Error(err))
	}
	r.attachThemePathForModes(requestID, modes)
	return modes, err
}

func (r *Repository) ListAllModes(requestID string) ([]model.Mode, error) {
	logger.L().Info("db list all modes", zap.String("request_id", requestID))
	var modes []model.Mode
	err := r.db.Order("id asc").Find(&modes).Error
	if err != nil {
		logger.L().Error("db list all modes failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return modes, err
}
func (r *Repository) GetModeByID(requestID string, id, userID uint) (*model.Mode, error) {
	logger.L().Info("db get mode by id", zap.String("request_id", requestID), zap.Uint("mode_id", id), zap.Uint("user_id", userID))
	var mode model.Mode
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&mode).Error; err != nil {
		logger.L().Error("db get mode by id failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	temp := []model.Mode{mode}
	r.attachThemePathForModes(requestID, temp)
	mode.ThemePath = temp[0].ThemePath
	return &mode, nil
}
func (r *Repository) UpdateMode(requestID string, mode *model.Mode) error {
	logger.L().Info("db update mode", zap.String("request_id", requestID), zap.Uint("mode_id", mode.ID), zap.Uint("user_id", mode.UserID))
	updates := map[string]any{
		"title":        mode.Name,
		"description":  mode.Description,
		"level":        mode.Level,
		"numbers":      mode.Numbers,
		"type":         mode.Type,
		"mode":         mode.Mode,
		"theme_id":     mode.ThemeID,
		"requirements": mode.Requirements,
	}
	err := r.db.Model(&model.Mode{}).Where("id = ? AND user_id = ?", mode.ID, mode.UserID).Updates(updates).Error
	if err != nil {
		logger.L().Error("db update mode failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}
func (r *Repository) DeleteMode(requestID string, id, userID uint) error {
	logger.L().Info("db delete mode", zap.String("request_id", requestID), zap.Uint("mode_id", id), zap.Uint("user_id", userID))
	err := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Mode{}).Error
	if err != nil {
		logger.L().Error("db delete mode failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}

func (r *Repository) CreateTheme(requestID string, theme *model.Theme) error {
	logger.L().Info("db create theme", zap.String("request_id", requestID), zap.Int("level", theme.Level))
	err := r.db.Create(theme).Error
	if err != nil {
		logger.L().Error("db create theme failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}

func (r *Repository) ListThemes(requestID string, parentID *uint, level *int) ([]model.Theme, error) {
	logger.L().Info("db list themes", zap.String("request_id", requestID))
	var items []model.Theme
	query := r.db.Model(&model.Theme{})
	if parentID == nil {
		query = query.Where("parent_id IS NULL")
	} else {
		query = query.Where("parent_id = ?", *parentID)
	}
	if level != nil {
		query = query.Where("level = ?", *level)
	}
	err := query.Order("sort_order asc, id asc").Find(&items).Error
	if err != nil {
		logger.L().Error("db list themes failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return items, err
}

func (r *Repository) GetThemeByID(requestID string, id uint) (*model.Theme, error) {
	logger.L().Info("db get theme by id", zap.String("request_id", requestID), zap.Uint("theme_id", id))
	var item model.Theme
	if err := r.db.Where("id = ?", id).First(&item).Error; err != nil {
		logger.L().Error("db get theme by id failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return &item, nil
}

func (r *Repository) UpdateTheme(requestID string, theme *model.Theme) error {
	logger.L().Info("db update theme", zap.String("request_id", requestID), zap.Uint("theme_id", theme.ID))
	updates := map[string]any{
		"name":       theme.Name,
		"parent_id":  theme.ParentID,
		"level":      theme.Level,
		"sort_order": theme.SortOrder,
	}
	err := r.db.Model(&model.Theme{}).Where("id = ?", theme.ID).Updates(updates).Error
	if err != nil {
		logger.L().Error("db update theme failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}

func (r *Repository) ExistsThemeByNameAndLevel(requestID, name string, level int, excludeID uint) (bool, error) {
	logger.L().Info("db exists theme by name and level", zap.String("request_id", requestID), zap.String("name", name), zap.Int("level", level), zap.Uint("exclude_id", excludeID))
	var count int64
	query := r.db.Model(&model.Theme{}).Where("name = ? AND level = ?", name, level)
	if excludeID > 0 {
		query = query.Where("id <> ?", excludeID)
	}
	err := query.Count(&count).Error
	if err != nil {
		logger.L().Error("db exists theme by name and level failed", zap.String("request_id", requestID), zap.Error(err))
		return false, err
	}
	return count > 0, nil
}

func (r *Repository) DeleteTheme(requestID string, id uint) error {
	logger.L().Info("db delete theme", zap.String("request_id", requestID), zap.Uint("theme_id", id))
	err := r.db.Where("id = ?", id).Delete(&model.Theme{}).Error
	if err != nil {
		logger.L().Error("db delete theme failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}

func (r *Repository) CountThemeChildren(requestID string, id uint) (int64, error) {
	logger.L().Info("db count theme children", zap.String("request_id", requestID), zap.Uint("theme_id", id))
	var count int64
	err := r.db.Model(&model.Theme{}).Where("parent_id = ?", id).Count(&count).Error
	if err != nil {
		logger.L().Error("db count theme children failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return count, err
}

func (r *Repository) CountModesByTheme(requestID string, id uint) (int64, error) {
	logger.L().Info("db count modes by theme", zap.String("request_id", requestID), zap.Uint("theme_id", id))
	var count int64
	err := r.db.Model(&model.Mode{}).Where("theme_id = ?", id).Count(&count).Error
	if err != nil {
		logger.L().Error("db count modes by theme failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return count, err
}

func (r *Repository) ListAllThemes(requestID string) ([]model.Theme, error) {
	logger.L().Info("db list all themes", zap.String("request_id", requestID))
	var items []model.Theme
	err := r.db.Model(&model.Theme{}).Order("level asc, sort_order asc, id asc").Find(&items).Error
	if err != nil {
		logger.L().Error("db list all themes failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return items, err
}

func (r *Repository) CreateQuestion(requestID string, question *model.UserQuestion) error {
	logger.L().Info("db create question", zap.String("request_id", requestID), zap.Uint("user_id", question.UserID), zap.Uint("mode_id", question.ModeID))
	if question.CreateTime.IsZero() {
		question.CreateTime = time.Now()
	}
	err := r.db.Create(question).Error
	if err != nil {
		logger.L().Error("db create question failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}
func (r *Repository) ListQuestions(
	requestID string,
	userID uint,
	startDate *time.Time,
	endDateExclusive *time.Time,
	modeIDs []uint,
	studyType *int,
	translationMode *int,
	minScore *int,
	maxScore *int,
) ([]model.UserQuestion, error) {
	logger.L().Info("db list questions", zap.String("request_id", requestID), zap.Uint("user_id", userID))
	var items []model.UserQuestion
	query := r.db.Where("user_questions.user_id = ?", userID)
	if startDate != nil {
		query = query.Where("user_questions.create_time >= ?", *startDate)
	}
	if endDateExclusive != nil {
		query = query.Where("user_questions.create_time < ?", *endDateExclusive)
	}
	if len(modeIDs) > 0 {
		query = query.Where("user_questions.mode_id IN ?", modeIDs)
	}
	if studyType != nil || translationMode != nil {
		query = query.Joins("JOIN modes ON modes.id = user_questions.mode_id")
	}
	if studyType != nil {
		query = query.Where("modes.type = ?", *studyType)
	}
	if translationMode != nil {
		query = query.Where("modes.mode = ?", *translationMode)
	}
	if minScore != nil {
		query = query.Where("user_questions.score >= ?", *minScore)
	}
	if maxScore != nil {
		query = query.Where("user_questions.score <= ?", *maxScore)
	}
	err := query.Order("user_questions.id desc").Find(&items).Error
	if err != nil {
		logger.L().Error("db list questions failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return items, err
}

func (r *Repository) ListQuestionTextsByMode(requestID string, userID, modeID uint) ([]string, error) {
	logger.L().Info("db list question texts by mode",
		zap.String("request_id", requestID),
		zap.Uint("user_id", userID),
		zap.Uint("mode_id", modeID),
	)
	var questions []string
	err := r.db.Model(&model.UserQuestion{}).
		Where("user_id = ? AND mode_id = ?", userID, modeID).
		Order("id desc").
		Pluck("question", &questions).Error
	if err != nil {
		logger.L().Error("db list question texts by mode failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return questions, err
}

func (r *Repository) CountPreGeneratedByStatus(requestID string, userID, modeID uint, status string) (int64, error) {
	logger.L().Info("db count pre-generated by status",
		zap.String("request_id", requestID),
		zap.Uint("user_id", userID),
		zap.Uint("mode_id", modeID),
		zap.String("status", status),
	)
	var count int64
	err := r.db.Model(&model.PreGeneratedQuestion{}).
		Where("user_id = ? AND mode_id = ? AND status = ?", userID, modeID, status).
		Count(&count).Error
	if err != nil {
		logger.L().Error("db count pre-generated by status failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return count, err
}

func (r *Repository) ListPreGeneratedQuestionTextsByMode(requestID string, userID, modeID uint) ([]string, error) {
	logger.L().Info("db list pre-generated question texts by mode",
		zap.String("request_id", requestID),
		zap.Uint("user_id", userID),
		zap.Uint("mode_id", modeID),
	)
	var questions []string
	err := r.db.Model(&model.PreGeneratedQuestion{}).
		Where("user_id = ? AND mode_id = ?", userID, modeID).
		Order("id desc").
		Pluck("question", &questions).Error
	if err != nil {
		logger.L().Error("db list pre-generated question texts by mode failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return questions, err
}

func (r *Repository) BulkCreatePreGeneratedQuestions(requestID string, items []model.PreGeneratedQuestion) error {
	if len(items) == 0 {
		return nil
	}
	logger.L().Info("db bulk create pre-generated questions", zap.String("request_id", requestID), zap.Int("count", len(items)))
	err := r.db.Create(&items).Error
	if err != nil {
		logger.L().Error("db bulk create pre-generated questions failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}

func (r *Repository) AcquireReadyPreGeneratedQuestions(
	requestID string,
	userID, modeID uint,
	limit int,
) ([]model.PreGeneratedQuestion, error) {
	if limit <= 0 {
		return nil, nil
	}
	logger.L().Info("db acquire ready pre-generated questions",
		zap.String("request_id", requestID),
		zap.Uint("user_id", userID),
		zap.Uint("mode_id", modeID),
		zap.Int("limit", limit),
	)

	acquired := make([]model.PreGeneratedQuestion, 0, limit)
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ? AND mode_id = ? AND status = ?", userID, modeID, "ready").
			Order("id asc").
			Limit(limit).
			Find(&acquired).Error; err != nil {
			return err
		}
		if len(acquired) == 0 {
			return nil
		}
		ids := make([]uint, 0, len(acquired))
		for _, item := range acquired {
			ids = append(ids, item.ID)
		}
		now := time.Now()
		if err := tx.Model(&model.PreGeneratedQuestion{}).
			Where("id IN ?", ids).
			Updates(map[string]any{
				"status":    "served",
				"served_at": now,
			}).Error; err != nil {
			return err
		}
		for index := range acquired {
			acquired[index].Status = "served"
			acquired[index].ServedAt = &now
		}
		return nil
	})
	if err != nil {
		logger.L().Error("db acquire ready pre-generated questions failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return acquired, err
}

func (r *Repository) DeleteServedPreGeneratedQuestion(
	requestID string,
	id, userID, modeID uint,
) error {
	logger.L().Info("db delete served pre-generated question",
		zap.String("request_id", requestID),
		zap.Uint("id", id),
		zap.Uint("user_id", userID),
		zap.Uint("mode_id", modeID),
	)
	result := r.db.Where(
		"id = ? AND user_id = ? AND mode_id = ? AND status = ?",
		id, userID, modeID, "served",
	).Delete(&model.PreGeneratedQuestion{})
	if result.Error != nil {
		logger.L().Error("db delete served pre-generated question failed", zap.String("request_id", requestID), zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *Repository) RecycleServedPreGeneratedQuestions(requestID string, expireBefore time.Time) (int64, error) {
	logger.L().Info("db recycle served pre-generated questions",
		zap.String("request_id", requestID),
		zap.Time("expire_before", expireBefore),
	)
	result := r.db.Model(&model.PreGeneratedQuestion{}).
		Where("status = ? AND served_at IS NOT NULL AND served_at < ?", "served", expireBefore).
		Updates(map[string]any{
			"status":    "ready",
			"served_at": nil,
		})
	if result.Error != nil {
		logger.L().Error("db recycle served pre-generated questions failed", zap.String("request_id", requestID), zap.Error(result.Error))
		return 0, result.Error
	}
	return result.RowsAffected, nil
}

func (r *Repository) UpdateQuestion(requestID string, question *model.UserQuestion) error {
	logger.L().Info("db update question", zap.String("request_id", requestID), zap.Uint("question_id", question.ID))
	err := r.db.Model(&model.UserQuestion{}).
		Where("id = ? AND user_id = ?", question.ID, question.UserID).Updates(question).Error
	if err != nil {
		logger.L().Error("db update question failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}
func (r *Repository) DeleteQuestion(requestID string, id, userID uint) error {
	logger.L().Info("db delete question", zap.String("request_id", requestID), zap.Uint("question_id", id), zap.Uint("user_id", userID))
	err := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.UserQuestion{}).Error
	if err != nil {
		logger.L().Error("db delete question failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return err
}

func (r *Repository) GetQuestionByID(requestID string, id, userID uint) (*model.UserQuestion, error) {
	logger.L().Info("db get question by id", zap.String("request_id", requestID), zap.Uint("question_id", id), zap.Uint("user_id", userID))
	var item model.UserQuestion
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&item).Error; err != nil {
		logger.L().Error("db get question by id failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	return &item, nil
}

func (r *Repository) ListTodayQuestions(
	requestID string,
	userID uint,
	dayStart, dayEnd time.Time,
	studyType *int,
	translationMode *int,
) ([]model.UserQuestion, error) {
	logger.L().Info("db list today questions", zap.String("request_id", requestID), zap.Uint("user_id", userID))
	var items []model.UserQuestion
	query := r.db.Where(
		"user_questions.user_id = ? AND user_questions.create_time >= ? AND user_questions.create_time < ?",
		userID,
		dayStart,
		dayEnd,
	)
	if studyType != nil || translationMode != nil {
		query = query.Joins("JOIN modes ON modes.id = user_questions.mode_id")
	}
	if studyType != nil {
		query = query.Where("modes.type = ?", *studyType)
	}
	if translationMode != nil {
		query = query.Where("modes.mode = ?", *translationMode)
	}
	err := query.Find(&items).Error
	if err != nil {
		logger.L().Error("db list today questions failed", zap.String("request_id", requestID), zap.Error(err))
	}
	return items, err
}

func (r *Repository) attachThemePathForModes(requestID string, modes []model.Mode) {
	if len(modes) == 0 {
		return
	}
	allThemes, err := r.ListAllThemes(requestID)
	if err != nil || len(allThemes) == 0 {
		return
	}
	themeByID := make(map[uint]model.Theme, len(allThemes))
	for _, item := range allThemes {
		themeByID[item.ID] = item
	}

	buildPath := func(themeID uint) string {
		path := make([]string, 0, 3)
		currentID := themeID
		for i := 0; i < 3; i++ {
			current, ok := themeByID[currentID]
			if !ok {
				break
			}
			path = append([]string{current.Name}, path...)
			if current.ParentID == nil {
				break
			}
			currentID = *current.ParentID
		}
		return strings.Join(path, " / ")
	}

	for index := range modes {
		if modes[index].ThemeID == nil {
			continue
		}
		themeID := *modes[index].ThemeID
		if _, ok := themeByID[themeID]; !ok {
			continue
		}
		modes[index].ThemePath = buildPath(themeID)
	}
}
