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
	"time"

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
	wechatWebAppID       string
	wechatWebAppSecret   string
	wechatWebCallbackURL string
	wechatWebFrontendURL string
	wechatSessionBaseURL string
	wechatOAuthBaseURL   string
	wechatUserInfoURL    string
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
func NewAuthService(
	repo *repository.Repository,
	jwtSecret,
	wechatMiniAppID,
	wechatMiniAppSecret,
	wechatWebAppID,
	wechatWebAppSecret,
	wechatWebCallbackURL,
	wechatWebFrontendURL string,
) *AuthService {
	return &AuthService{
		repo:                 repo,
		jwtSecret:            jwtSecret,
		wechatMiniAppID:      wechatMiniAppID,
		wechatMiniAppSecret:  wechatMiniAppSecret,
		wechatWebAppID:       wechatWebAppID,
		wechatWebAppSecret:   wechatWebAppSecret,
		wechatWebCallbackURL: wechatWebCallbackURL,
		wechatWebFrontendURL: wechatWebFrontendURL,
		wechatSessionBaseURL: "https://api.weixin.qq.com/sns/jscode2session",
		wechatOAuthBaseURL:   "https://api.weixin.qq.com/sns/oauth2/access_token",
		wechatUserInfoURL:    "https://api.weixin.qq.com/sns/userinfo",
	}
}

func (s *AuthService) Register(requestID, email, password, name, phone, learningGoal string) (string, *AuthUserProfile, error) {
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
	if trimmedGoal := strings.TrimSpace(learningGoal); trimmedGoal != "" {
		now := time.Now()
		dueDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		learningProfile := &model.LearningProfile{
			UserID:                user.ID,
			Goal:                  trimmedGoal,
			DailyMinutes:          20,
			StudyTimeRange:        "",
			TranslationMode:       translationModeZhToEn,
			Focuses:               model.StringList{"word", "sentence", "article"},
			WordLevel:             3,
			SentenceLevel:         3,
			OverallLevel:          3,
			OnboardingCompleted:   false,
			NextAssessmentType:    assessmentTypeInitial,
			NextAssessmentDueDate: &dueDate,
		}
		if err := s.repo.UpsertLearningProfile(requestID, learningProfile); err != nil {
			logger.L().Error("auth register failed create learning profile", zap.String("request_id", requestID), zap.Error(err))
			return "", nil, err
		}
	}
	token, err := auth.GenerateToken(user.ID, s.jwtSecret)
	if err != nil {
		logger.L().Error("auth register failed generate token", zap.String("request_id", requestID), zap.Error(err))
	}
	authProfile, profileErr := s.buildAuthUserProfile(requestID, user)
	if profileErr != nil {
		return "", nil, profileErr
	}
	return token, authProfile, err
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

func (s *AuthService) BuildWeChatWebLoginURL(state string) (string, error) {
	if strings.TrimSpace(s.wechatWebAppID) == "" ||
		strings.TrimSpace(s.wechatWebAppSecret) == "" ||
		strings.TrimSpace(s.wechatWebCallbackURL) == "" ||
		strings.TrimSpace(s.wechatWebFrontendURL) == "" {
		return "", errors.New("wechat web login is not configured")
	}
	query := url.Values{}
	query.Set("appid", s.wechatWebAppID)
	query.Set("redirect_uri", s.wechatWebCallbackURL)
	query.Set("response_type", "code")
	query.Set("scope", "snsapi_login")
	query.Set("state", state)
	return fmt.Sprintf("https://open.weixin.qq.com/connect/qrconnect?%s#wechat_redirect", query.Encode()), nil
}

func (s *AuthService) WechatWebLogin(requestID, code string) (string, *AuthUserProfile, error) {
	if strings.TrimSpace(s.wechatWebAppID) == "" ||
		strings.TrimSpace(s.wechatWebAppSecret) == "" ||
		strings.TrimSpace(s.wechatWebCallbackURL) == "" ||
		strings.TrimSpace(s.wechatWebFrontendURL) == "" {
		return "", nil, errors.New("wechat web login is not configured")
	}
	session, err := s.fetchWeChatWebSession(code)
	if err != nil {
		logger.L().Error("wechat web login fetch session failed", zap.String("request_id", requestID), zap.Error(err))
		return "", nil, err
	}
	if strings.TrimSpace(session.OpenID) == "" {
		return "", nil, errors.New("wechat login returned empty openid")
	}

	user, err := s.findOrCreateWeChatWebUser(requestID, session)
	if err != nil {
		return "", nil, err
	}

	token, err := auth.GenerateToken(user.ID, s.jwtSecret)
	if err != nil {
		logger.L().Error("wechat web login generate token failed", zap.String("request_id", requestID), zap.Error(err))
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

func (s *AuthService) WechatWebFrontendLoginURL() string {
	return s.wechatWebFrontendURL
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

type wechatWebSession struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	OpenID       string `json:"openid"`
	Scope        string `json:"scope"`
	UnionID      string `json:"unionid"`
	ErrCode      int    `json:"errcode"`
	ErrMsg       string `json:"errmsg"`
}

type wechatWebUserInfo struct {
	OpenID     string `json:"openid"`
	Nickname   string `json:"nickname"`
	HeadImgURL string `json:"headimgurl"`
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

func (s *AuthService) fetchWeChatWebSession(code string) (*wechatWebSession, error) {
	query := url.Values{}
	query.Set("appid", s.wechatWebAppID)
	query.Set("secret", s.wechatWebAppSecret)
	query.Set("code", code)
	query.Set("grant_type", "authorization_code")

	response, err := http.Get(fmt.Sprintf("%s?%s", s.wechatOAuthBaseURL, query.Encode()))
	if err != nil {
		return nil, errors.New("wechat oauth request failed")
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, errors.New("wechat oauth response read failed")
	}

	var session wechatWebSession
	if err := json.Unmarshal(body, &session); err != nil {
		return nil, errors.New("wechat oauth response parse failed")
	}
	if session.ErrCode != 0 {
		return nil, fmt.Errorf("wechat login failed: %s", strings.TrimSpace(session.ErrMsg))
	}
	return &session, nil
}

func (s *AuthService) fetchWeChatWebUserInfo(accessToken, openID string) (*wechatWebUserInfo, error) {
	query := url.Values{}
	query.Set("access_token", accessToken)
	query.Set("openid", openID)

	response, err := http.Get(fmt.Sprintf("%s?%s", s.wechatUserInfoURL, query.Encode()))
	if err != nil {
		return nil, errors.New("wechat user info request failed")
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, errors.New("wechat user info response read failed")
	}

	var userInfo wechatWebUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, errors.New("wechat user info response parse failed")
	}
	if userInfo.ErrCode != 0 {
		return nil, fmt.Errorf("wechat user info failed: %s", strings.TrimSpace(userInfo.ErrMsg))
	}
	return &userInfo, nil
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

func (s *AuthService) findOrCreateWeChatWebUser(requestID string, session *wechatWebSession) (*model.User, error) {
	email := buildWeChatWebShadowEmail(session.OpenID)
	user, err := s.repo.GetUserByEmail(requestID, email)
	if err == nil {
		return user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	userInfo, userInfoErr := s.fetchWeChatWebUserInfo(session.AccessToken, session.OpenID)
	if userInfoErr != nil {
		logger.L().Warn("wechat web login fetch user info failed", zap.String("request_id", requestID), zap.Error(userInfoErr))
	}
	return s.createWeChatWebUser(requestID, session.OpenID, email, userInfo)
}

func (s *AuthService) createWeChatWebUser(
	requestID,
	openID,
	email string,
	userInfo *wechatWebUserInfo,
) (*model.User, error) {
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
	name := fmt.Sprintf("微信用户%s", suffix)
	image := ""
	if userInfo != nil {
		if strings.TrimSpace(userInfo.Nickname) != "" {
			name = userInfo.Nickname
		}
		image = strings.TrimSpace(userInfo.HeadImgURL)
	}
	user := &model.User{
		Email:        email,
		Name:         name,
		Image:        image,
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

func buildWeChatWebShadowEmail(openID string) string {
	return fmt.Sprintf("wxweb_%s@wechat-web.local", openID)
}

func randomHex(byteLength int) (string, error) {
	buffer := make([]byte, byteLength)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}
