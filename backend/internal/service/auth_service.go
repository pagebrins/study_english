package service

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"study_english/backend/internal/model"
	"study_english/backend/internal/pkg/auth"
	"study_english/backend/internal/pkg/authz"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/repository"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthService handles auth business logic.
type AuthService struct {
	repo                 *repository.Repository
	jwtSecret            string
	wechatMiniAppID      string
	wechatMiniAppSecret  string
	wechatSessionBaseURL string
}

type AuthUserProfile struct {
	ID          uint     `json:"id"`
	Email       string   `json:"email"`
	Name        string   `json:"name"`
	Phone       string   `json:"phone,omitempty"`
	Image       string   `json:"image,omitempty"`
	RoleCode    string   `json:"role_code"`
	RoleName    string   `json:"role_name"`
	Permissions []string `json:"permissions"`
}

// NewAuthService creates auth service.
func NewAuthService(repo *repository.Repository, jwtSecret, wechatMiniAppID, wechatMiniAppSecret string) *AuthService {
	return &AuthService{
		repo:                 repo,
		jwtSecret:            jwtSecret,
		wechatMiniAppID:      wechatMiniAppID,
		wechatMiniAppSecret:  wechatMiniAppSecret,
		wechatSessionBaseURL: "https://api.weixin.qq.com/sns/jscode2session",
	}
}

func (s *AuthService) Register(requestID, email, password, name, phone string) (string, *AuthUserProfile, error) {
	logger.L().Info("auth register", zap.String("request_id", requestID), zap.String("email", email))
	_, err := s.repo.GetUserByEmail(requestID, email)
	if err == nil {
		logger.L().Error("auth register failed email exists", zap.String("request_id", requestID))
		return "", nil, errors.New("email already exists")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		logger.L().Error("auth register failed get user", zap.String("request_id", requestID), zap.Error(err))
		return "", nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		logger.L().Error("auth register failed hash password", zap.String("request_id", requestID), zap.Error(err))
		return "", nil, err
	}
	user := &model.User{Email: email, Name: name, Phone: phone, PasswordHash: string(hash)}
	if err := s.repo.CreateUser(requestID, user); err != nil {
		logger.L().Error("auth register failed create user", zap.String("request_id", requestID), zap.Error(err))
		return "", nil, err
	}
	guestRole, err := s.repo.GetRoleByCode(requestID, authz.RoleGuest)
	if err != nil {
		logger.L().Error("auth register failed get guest role", zap.String("request_id", requestID), zap.Error(err))
		return "", nil, err
	}
	if err := s.repo.UpsertUserRole(requestID, user.ID, guestRole.ID); err != nil {
		logger.L().Error("auth register failed bind guest role", zap.String("request_id", requestID), zap.Error(err))
		return "", nil, err
	}
	token, err := auth.GenerateToken(user.ID, s.jwtSecret)
	if err != nil {
		logger.L().Error("auth register failed generate token", zap.String("request_id", requestID), zap.Error(err))
	}
	profile, profileErr := s.buildAuthUserProfile(requestID, user)
	if profileErr != nil {
		return "", nil, profileErr
	}
	return token, profile, err
}

func (s *AuthService) Login(requestID, email, password string) (string, *AuthUserProfile, error) {
	logger.L().Info("auth login", zap.String("request_id", requestID), zap.String("email", email))
	user, err := s.repo.GetUserByEmail(requestID, email)
	if err != nil {
		logger.L().Error("auth login failed get user", zap.String("request_id", requestID), zap.Error(err))
		return "", nil, errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		logger.L().Error("auth login failed compare password", zap.String("request_id", requestID), zap.Error(err))
		return "", nil, errors.New("invalid credentials")
	}
	token, err := auth.GenerateToken(user.ID, s.jwtSecret)
	if err != nil {
		logger.L().Error("auth login failed generate token", zap.String("request_id", requestID), zap.Error(err))
	}
	profile, profileErr := s.buildAuthUserProfile(requestID, user)
	if profileErr != nil {
		return "", nil, profileErr
	}
	return token, profile, err
}

func (s *AuthService) ResetPassword(requestID, email, newPassword string) error {
	user, err := s.repo.GetUserByEmail(requestID, email)
	if err != nil || user == nil {
		return errors.New("user not found")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		logger.L().Error("auth reset password failed hash password", zap.String("request_id", requestID), zap.Error(err))
		return err
	}
	if err := s.repo.UpdateUserPasswordByEmail(requestID, email, string(hash)); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("user not found")
		}
		return err
	}
	return nil
}

func (s *AuthService) WechatMiniLogin(requestID, code string) (string, *AuthUserProfile, error) {
	if strings.TrimSpace(s.wechatMiniAppID) == "" || strings.TrimSpace(s.wechatMiniAppSecret) == "" {
		return "", nil, errors.New("wechat miniapp login is not configured")
	}
	session, err := s.fetchWeChatSession(code)
	if err != nil {
		logger.L().Error("wechat mini login fetch session failed", zap.String("request_id", requestID), zap.Error(err))
		return "", nil, err
	}
	if strings.TrimSpace(session.OpenID) == "" {
		return "", nil, errors.New("wechat login returned empty openid")
	}
	email := buildWeChatShadowEmail(session.OpenID)
	user, err := s.repo.GetUserByEmail(requestID, email)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, err
		}
		user, err = s.createWeChatUser(requestID, session.OpenID, email)
		if err != nil {
			return "", nil, err
		}
	}
	token, err := auth.GenerateToken(user.ID, s.jwtSecret)
	if err != nil {
		logger.L().Error("wechat mini login generate token failed", zap.String("request_id", requestID), zap.Error(err))
		return "", nil, err
	}
	profile, err := s.buildAuthUserProfile(requestID, user)
	if err != nil {
		return "", nil, err
	}
	return token, profile, nil
}

func (s *AuthService) Me(requestID string, userID uint) (*AuthUserProfile, error) {
	user, err := s.repo.GetUserByID(requestID, userID)
	if err != nil {
		return nil, err
	}
	return s.buildAuthUserProfile(requestID, user)
}

func (s *AuthService) buildAuthUserProfile(requestID string, user *model.User) (*AuthUserProfile, error) {
	role, roleErr := s.repo.GetUserRole(requestID, user.ID)
	if roleErr != nil {
		return nil, roleErr
	}
	permissions, permErr := s.repo.ListUserPermissionCodes(requestID, user.ID)
	if permErr != nil {
		return nil, permErr
	}
	return &AuthUserProfile{
		ID:          user.ID,
		Email:       user.Email,
		Name:        user.Name,
		Phone:       user.Phone,
		Image:       user.Image,
		RoleCode:    role.Code,
		RoleName:    role.Name,
		Permissions: permissions,
	}, nil
}

type wechatMiniSession struct {
	OpenID     string `json:"openid"`
	SessionKey string `json:"session_key"`
	UnionID    string `json:"unionid"`
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

func (s *AuthService) fetchWeChatSession(code string) (*wechatMiniSession, error) {
	query := url.Values{}
	query.Set("appid", s.wechatMiniAppID)
	query.Set("secret", s.wechatMiniAppSecret)
	query.Set("js_code", code)
	query.Set("grant_type", "authorization_code")

	response, err := http.Get(fmt.Sprintf("%s?%s", s.wechatSessionBaseURL, query.Encode()))
	if err != nil {
		return nil, errors.New("wechat session request failed")
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, errors.New("wechat session response read failed")
	}

	var session wechatMiniSession
	if err := json.Unmarshal(body, &session); err != nil {
		return nil, errors.New("wechat session response parse failed")
	}
	if session.ErrCode != 0 {
		return nil, fmt.Errorf("wechat login failed: %s", strings.TrimSpace(session.ErrMsg))
	}
	return &session, nil
}

func (s *AuthService) createWeChatUser(requestID, openID, email string) (*model.User, error) {
	passwordSeed, err := randomHex(16)
	if err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(passwordSeed), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	suffix := openID
	if len(suffix) > 6 {
		suffix = suffix[len(suffix)-6:]
	}
	user := &model.User{
		Email:        email,
		Name:         fmt.Sprintf("微信用户%s", suffix),
		PasswordHash: string(hash),
	}
	if err := s.repo.CreateUser(requestID, user); err != nil {
		return nil, err
	}
	guestRole, err := s.repo.GetRoleByCode(requestID, authz.RoleGuest)
	if err != nil {
		return nil, err
	}
	if err := s.repo.UpsertUserRole(requestID, user.ID, guestRole.ID); err != nil {
		return nil, err
	}
	return user, nil
}

func buildWeChatShadowEmail(openID string) string {
	return fmt.Sprintf("wx_%s@miniapp.local", openID)
}

func randomHex(byteLength int) (string, error) {
	buffer := make([]byte, byteLength)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}
