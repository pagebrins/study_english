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

// Pronunciation describes one playable pronunciation resource.
type Pronunciation struct {
	Text     string `json:"text"`
	Lang     string `json:"lang"`
	AudioURL string `json:"audio_url"`
	Provider string `json:"provider"`
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
	Source       string     `gorm:"type:varchar(20);not null;default:manual" json:"source"`
	PlanItemID   *uint      `gorm:"column:plan_item_id;index" json:"plan_item_id,omitempty"`
	ThemeID      *uint      `gorm:"column:theme_id" json:"theme_id,omitempty"`
	ThemePath    string     `gorm:"-" json:"theme_path,omitempty"`
	Requirements StringList `gorm:"type:text" json:"requirements"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// LearningProfile stores user goals and self-assessment used for planning.
type LearningProfile struct {
	ID                    uint       `gorm:"primaryKey" json:"id"`
	UserID                uint       `gorm:"uniqueIndex;not null" json:"user_id"`
	Goal                  string     `gorm:"type:varchar(255);not null" json:"goal"`
	DailyMinutes          int        `gorm:"not null;default:20" json:"daily_minutes"`
	StudyTimeRange        string     `gorm:"type:varchar(120)" json:"study_time_range"`
	TranslationMode       int        `gorm:"type:tinyint;not null;default:1" json:"translation_mode"`
	Focuses               StringList `gorm:"type:text" json:"focuses"`
	Notes                 string     `gorm:"type:text" json:"notes"`
	WordLevel             int        `gorm:"not null;default:3" json:"word_level"`
	SentenceLevel         int        `gorm:"not null;default:3" json:"sentence_level"`
	OverallLevel          int        `gorm:"not null;default:3" json:"overall_level"`
	OnboardingCompleted   bool       `gorm:"not null;default:false" json:"onboarding_completed"`
	LastAssessmentAt      *time.Time `json:"last_assessment_at,omitempty"`
	NextAssessmentType    string     `gorm:"type:varchar(20);not null;default:initial" json:"next_assessment_type"`
	NextAssessmentDueDate *time.Time `json:"next_assessment_due_date,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

// LearningPlan stores the current auto-generated study plan.
type LearningPlan struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"index;not null" json:"user_id"`
	ProfileID    uint      `gorm:"index;not null" json:"profile_id"`
	AssessmentID *uint     `gorm:"index" json:"assessment_id,omitempty"`
	Title        string    `gorm:"type:varchar(120);not null" json:"title"`
	GoalSummary  string    `gorm:"type:text" json:"goal_summary"`
	Status       string    `gorm:"type:varchar(20);not null;default:active;index" json:"status"`
	Version      int       `gorm:"not null;default:1" json:"version"`
	PlanDate     time.Time `gorm:"type:date;not null" json:"plan_date"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// LearningPlanItem stores one executable task inside a study plan.
type LearningPlanItem struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	PlanID          uint       `gorm:"index;not null" json:"plan_id"`
	UserID          uint       `gorm:"index;not null" json:"user_id"`
	Name            string     `gorm:"type:varchar(120);not null" json:"name"`
	Description     string     `gorm:"type:text" json:"description"`
	StudyType       int        `gorm:"type:tinyint;not null" json:"study_type"`
	TranslationMode int        `gorm:"type:tinyint;not null;default:1" json:"translation_mode"`
	Level           int        `gorm:"not null" json:"level"`
	Numbers         int        `gorm:"not null" json:"numbers"`
	EstimatedMin    int        `gorm:"not null;default:10" json:"estimated_minutes"`
	ThemeID         *uint      `gorm:"column:theme_id" json:"theme_id,omitempty"`
	Requirements    StringList `gorm:"type:text" json:"requirements"`
	ModeID          *uint      `gorm:"column:mode_id;index" json:"mode_id,omitempty"`
	SortOrder       int        `gorm:"not null;default:0" json:"sort_order"`
	Status          string     `gorm:"type:varchar(20);not null;default:active" json:"status"`
	ThemePath       string     `gorm:"-" json:"theme_path,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// LearningAssessment stores one initial or adaptive difficulty assessment.
type LearningAssessment struct {
	ID                  uint       `gorm:"primaryKey" json:"id"`
	UserID              uint       `gorm:"index;not null" json:"user_id"`
	ProfileID           uint       `gorm:"index;not null" json:"profile_id"`
	AssessmentType      string     `gorm:"type:varchar(20);not null" json:"assessment_type"`
	TriggerReason       string     `gorm:"type:varchar(50);not null" json:"trigger_reason"`
	Status              string     `gorm:"type:varchar(20);not null;default:pending;index" json:"status"`
	WordLevelBefore     int        `gorm:"not null;default:3" json:"word_level_before"`
	SentenceLevelBefore int        `gorm:"not null;default:3" json:"sentence_level_before"`
	WordLevelAfter      int        `gorm:"not null;default:3" json:"word_level_after"`
	SentenceLevelAfter  int        `gorm:"not null;default:3" json:"sentence_level_after"`
	OverallLevelAfter   int        `gorm:"not null;default:3" json:"overall_level_after"`
	StartedAt           *time.Time `json:"started_at,omitempty"`
	CompletedAt         *time.Time `json:"completed_at,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// LearningAssessmentItem stores each question inside one assessment.
type LearningAssessmentItem struct {
	ID                     uint           `gorm:"primaryKey" json:"id"`
	AssessmentID           uint           `gorm:"index;not null" json:"assessment_id"`
	StudyType              int            `gorm:"type:tinyint;not null" json:"study_type"`
	TranslationMode        int            `gorm:"type:tinyint;not null;default:1" json:"translation_mode"`
	Level                  int            `gorm:"not null;default:3" json:"level"`
	Question               string         `gorm:"type:text;not null" json:"question"`
	AnswerKey              string         `gorm:"type:text;not null" json:"answer_key"`
	UserAnswer             string         `gorm:"type:text" json:"user_answer"`
	Score                  int            `gorm:"not null;default:0" json:"score"`
	QuestionPronunciation  *Pronunciation `gorm:"-" json:"question_pronunciation,omitempty"`
	AnswerKeyPronunciation *Pronunciation `gorm:"-" json:"answer_key_pronunciation,omitempty"`
	CreatedAt              time.Time      `json:"created_at"`
	UpdatedAt              time.Time      `json:"updated_at"`
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

// Word stores vocabulary knowledge base entries.
type Word struct {
	ID                   uint           `gorm:"primaryKey" json:"id"`
	Word                 string         `gorm:"type:varchar(120);not null;index:idx_word_category,unique" json:"word"`
	Definition           string         `gorm:"type:text;not null" json:"definition"`
	L1Category           string         `gorm:"column:l1_category;type:varchar(120);not null;index:idx_word_category,unique" json:"l1_category"`
	L2Category           string         `gorm:"column:l2_category;type:varchar(120);not null;default:'';index:idx_word_category,unique" json:"l2_category"`
	Example              string         `gorm:"type:text" json:"example"`
	Tags                 []WordTag      `gorm:"foreignKey:WordID;constraint:OnDelete:CASCADE" json:"tags"`
	WordPronunciation    *Pronunciation `gorm:"-" json:"word_pronunciation,omitempty"`
	ExamplePronunciation *Pronunciation `gorm:"-" json:"example_pronunciation,omitempty"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
}

// WordTag stores tag data attached to a word.
type WordTag struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	WordID       uint      `gorm:"index;not null" json:"word_id"`
	CategoryID   uint      `gorm:"column:category_id;not null;default:0" json:"category_id"`
	CategoryName string    `gorm:"column:category_name;type:varchar(120);not null" json:"category_name"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// UserQuestion stores answered questions.
type UserQuestion struct {
	ID                     uint           `gorm:"primaryKey" json:"id"`
	UserID                 uint           `gorm:"index;not null" json:"user_id"`
	ModeID                 uint           `gorm:"index;not null" json:"mode_id"`
	Question               string         `gorm:"type:text" json:"question"`
	AnswerKey              string         `gorm:"type:text" json:"answer_key"`
	AnswerText             string         `gorm:"type:text" json:"answer_text"`
	Score                  int            `json:"score"`
	PreGeneratedID         *uint          `gorm:"-" json:"pre_generated_id,omitempty"`
	QuestionPronunciation  *Pronunciation `gorm:"-" json:"question_pronunciation,omitempty"`
	AnswerKeyPronunciation *Pronunciation `gorm:"-" json:"answer_key_pronunciation,omitempty"`
	CreateTime             time.Time      `gorm:"index" json:"create_time"`
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
