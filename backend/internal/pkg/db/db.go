package db

import (
	"fmt"
	"study_english/backend/internal/model"
	"study_english/backend/internal/pkg/logger"

	"go.uber.org/zap"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// New creates DB connection and auto migrates models.
func New(driver, dbPath, mysqlDSN string) (*gorm.DB, error) {
	logger.L().Info("db init start", zap.String("request_id", "-"), zap.String("driver", driver))
	var (
		database *gorm.DB
		err      error
	)
	switch driver {
	case "mysql":
		logger.L().Info("db connect mysql", zap.String("request_id", "-"))
		database, err = gorm.Open(mysql.Open(mysqlDSN), &gorm.Config{})
	case "sqlite":
		logger.L().Info("db connect sqlite", zap.String("request_id", "-"), zap.String("path", dbPath))
		database, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	default:
		logger.L().Error("db unsupported driver", zap.String("request_id", "-"), zap.String("driver", driver))
		return nil, fmt.Errorf("unsupported DB_DRIVER: %s", driver)
	}
	if err != nil {
		logger.L().Error("db connect failed", zap.String("request_id", "-"), zap.Error(err))
		return nil, err
	}
	logger.L().Info("db automigrate start", zap.String("request_id", "-"))
	if err := database.AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.Permission{},
		&model.RolePermission{},
		&model.UserRole{},
		&model.Theme{},
		&model.Mode{},
		&model.UserQuestion{},
		&model.PreGeneratedQuestion{},
	); err != nil {
		logger.L().Error("db automigrate failed", zap.String("request_id", "-"), zap.Error(err))
		return nil, err
	}
	logger.L().Info("db init success", zap.String("request_id", "-"))
	return database, nil
}
