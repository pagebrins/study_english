package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// StringList stores string slices as JSON in DB.
type StringList []string

// Value converts StringList into DB value.
func (s StringList) Value() (driver.Value, error) {
	if len(s) == 0 {
		return "[]", nil
	}
	data, err := json.Marshal([]string(s))
	if err != nil {
		return nil, err
	}
	return string(data), nil
}

// Scan reads DB value into StringList.
func (s *StringList) Scan(value any) error {
	if value == nil {
		*s = StringList{}
		return nil
	}
	var raw []byte
	switch v := value.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("unsupported StringList scan type: %T", value)
	}
	if len(raw) == 0 {
		*s = StringList{}
		return nil
	}
	var parsed []string
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return err
	}
	*s = StringList(parsed)
	return nil
}

// User is account model.
type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Email        string    `gorm:"type:varchar(191);uniqueIndex;not null" json:"email"`
	Name         string    `gorm:"type:varchar(100);not null" json:"name"`
	Phone        string    `gorm:"type:varchar(30)" json:"phone"`
	Image        string    `gorm:"type:varchar(255)" json:"image"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Role stores role definitions.
type Role struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Code        string    `gorm:"type:varchar(64);uniqueIndex;not null" json:"code"`
	Name        string    `gorm:"type:varchar(120);not null" json:"name"`
	Description string    `gorm:"type:varchar(255)" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Permission stores permission definitions.
type Permission struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Code        string    `gorm:"type:varchar(128);uniqueIndex;not null" json:"code"`
	Name        string    `gorm:"type:varchar(120);not null" json:"name"`
	Description string    `gorm:"type:varchar(255)" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// RolePermission maps role to permission.
type RolePermission struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	RoleID       uint      `gorm:"index:idx_role_permission_unique,unique;not null" json:"role_id"`
	PermissionID uint      `gorm:"index:idx_role_permission_unique,unique;not null" json:"permission_id"`
	CreatedAt    time.Time `json:"created_at"`
}

// UserRole maps user to role.
type UserRole struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index:idx_user_role_unique,unique;not null" json:"user_id"`
	RoleID    uint      `gorm:"not null" json:"role_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserRoleView is permission page user-role projection.
type UserRoleView struct {
	UserID   uint   `json:"user_id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	RoleID   uint   `json:"role_id"`
	RoleCode string `json:"role_code"`
	RoleName string `json:"role_name"`
}

// Mode is study mode model.
type Mode struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	UserID       uint       `gorm:"index;not null" json:"user_id"`
	Name         string     `gorm:"column:title;type:varchar(120);not null" json:"name"`
	Description  string     `json:"description"`
	Level        int        `json:"level"`
	Numbers      int        `json:"numbers"`
	Type         int        `gorm:"type:tinyint;not null;default:2" json:"type"`
	Mode         int        `gorm:"column:mode;type:tinyint;not null;default:1" json:"mode"`
	ThemeID      *uint      `gorm:"column:theme_id" json:"theme_id,omitempty"`
	ThemePath    string     `gorm:"-" json:"theme_path,omitempty"`
	Requirements StringList `gorm:"type:text" json:"requirements"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// Theme stores 3-level global topic tree.
type Theme struct {
	ID        uint      `gorm:"autoIncrement;uniqueIndex:uk_themes_id" json:"id"`
	Name      string    `gorm:"primaryKey;type:varchar(120);not null" json:"name"`
	ParentID  *uint     `gorm:"index" json:"parent_id,omitempty"`
	Level     int       `gorm:"primaryKey;type:tinyint;not null" json:"level"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserQuestion stores answered questions.
type UserQuestion struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	UserID         uint      `gorm:"index;not null" json:"user_id"`
	ModeID         uint      `gorm:"index;not null" json:"mode_id"`
	Question       string    `gorm:"type:text" json:"question"`
	AnswerKey      string    `gorm:"type:text" json:"answer_key"`
	AnswerText     string    `gorm:"type:text" json:"answer_text"`
	Score          int       `json:"score"`
	PreGeneratedID *uint     `gorm:"-" json:"pre_generated_id,omitempty"`
	CreateTime     time.Time `gorm:"index" json:"create_time"`
}

// PreGeneratedQuestion stores warmup questions by user+mode.
type PreGeneratedQuestion struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	UserID     uint       `gorm:"index:idx_pgq_user_mode_status;not null" json:"user_id"`
	ModeID     uint       `gorm:"index:idx_pgq_user_mode_status;not null" json:"mode_id"`
	Question   string     `gorm:"type:text;not null" json:"question"`
	AnswerKey  string     `gorm:"type:text;not null" json:"answer_key"`
	Status     string     `gorm:"type:varchar(16);index:idx_pgq_user_mode_status;not null;default:ready" json:"status"`
	ServedAt   *time.Time `gorm:"index:idx_pgq_status_served_at" json:"served_at,omitempty"`
	CreateTime time.Time  `gorm:"column:create_time;not null;autoCreateTime" json:"create_time"`
	UpdateTime time.Time  `gorm:"column:update_time;not null;autoUpdateTime" json:"update_time"`
}
