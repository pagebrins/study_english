package handler

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"net/url"
	"strings"

	"study_english/backend/internal/middleware"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/pkg/response"
	"study_english/backend/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AuthHandler handles auth endpoints.
type AuthHandler struct {
	service *service.AuthService
}

// NewAuthHandler creates auth handler.
func NewAuthHandler(service *service.AuthService) *AuthHandler { return &AuthHandler{service: service} }

const wechatWebStateCookieName = "wechat_web_login_state"

func (h *AuthHandler) Register(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var req struct {
		Email        string `json:"email" binding:"required,email"`
		Password     string `json:"password" binding:"required,min=6"`
		Name         string `json:"name" binding:"required"`
		Phone        string `json:"phone"`
		LearningGoal string `json:"learning_goal"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("auth register bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	logger.L().Info("auth register request", zap.String("request_id", requestID), zap.String("email", req.Email))
	token, user, err := h.service.Register(requestID, req.Email, req.Password, req.Name, req.Phone, req.LearningGoal)
	if err != nil {
		logger.L().Error("auth register failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", gin.H{"token": token, "user": user})
}

func (h *AuthHandler) Login(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("auth login bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	logger.L().Info("auth login request", zap.String("request_id", requestID), zap.String("email", req.Email))
	token, user, err := h.service.Login(requestID, req.Email, req.Password)
	if err != nil {
		logger.L().Warn("auth login failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusUnauthorized, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", gin.H{"token": token, "user": user})
}

func (h *AuthHandler) WechatMiniLogin(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("auth wechat mini login bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	token, user, err := h.service.WechatMiniLogin(requestID, req.Code)
	if err != nil {
		logger.L().Warn("auth wechat mini login failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusUnauthorized, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", gin.H{"token": token, "user": user})
}

func (h *AuthHandler) WechatWebStart(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	state, err := randomHex(16)
	if err != nil {
		logger.L().Error("auth wechat web start build state failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusInternalServerError, "wechat login init failed", nil)
		return
	}
	loginURL, err := h.service.BuildWeChatWebLoginURL(state)
	if err != nil {
		logger.L().Warn("auth wechat web start failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	ctx.SetSameSite(http.SameSiteLaxMode)
	ctx.SetCookie(wechatWebStateCookieName, state, 600, "/", "", ctx.Request.TLS != nil, true)
	ctx.Redirect(http.StatusFound, loginURL)
}

func (h *AuthHandler) WechatWebCallback(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	state := strings.TrimSpace(ctx.Query("state"))
	code := strings.TrimSpace(ctx.Query("code"))
	if state == "" || code == "" {
		h.redirectWeChatWebResult(ctx, "", "wechat login callback is missing code or state")
		return
	}
	expectedState, err := ctx.Cookie(wechatWebStateCookieName)
	if err != nil || strings.TrimSpace(expectedState) == "" || expectedState != state {
		logger.L().Warn("auth wechat web callback invalid state", zap.String("request_id", requestID), zap.Error(err))
		h.redirectWeChatWebResult(ctx, "", "wechat login state validation failed")
		return
	}

	ctx.SetSameSite(http.SameSiteLaxMode)
	ctx.SetCookie(wechatWebStateCookieName, "", -1, "/", "", ctx.Request.TLS != nil, true)

	token, _, loginErr := h.service.WechatWebLogin(requestID, code)
	if loginErr != nil {
		logger.L().Warn("auth wechat web callback login failed", zap.String("request_id", requestID), zap.Error(loginErr))
		h.redirectWeChatWebResult(ctx, "", loginErr.Error())
		return
	}
	h.redirectWeChatWebResult(ctx, token, "")
}

func (h *AuthHandler) ResetPassword(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var req struct {
		Email       string `json:"email" binding:"required,email"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("auth reset password bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	if err := h.service.ResetPassword(requestID, req.Email, req.NewPassword); err != nil {
		logger.L().Warn("auth reset password failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", true)
}

func (h *AuthHandler) Me(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	user, err := h.service.Me(requestID, userID)
	if err != nil {
		logger.L().Error("auth me failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusNotFound, "user not found", nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", user)
}

func (h *AuthHandler) redirectWeChatWebResult(ctx *gin.Context, token, message string) {
	target := h.service.WechatWebFrontendLoginURL()
	if strings.TrimSpace(target) == "" {
		response.JSON(ctx, http.StatusBadRequest, "wechat web login is not configured", nil)
		return
	}
	redirectURL, err := url.Parse(target)
	if err != nil {
		response.JSON(ctx, http.StatusBadRequest, "invalid wechat web frontend login url", nil)
		return
	}
	query := redirectURL.Query()
	redirectURL.RawQuery = query.Encode()
	fragment := url.Values{}
	if strings.TrimSpace(token) != "" {
		fragment.Set("wechat_token", token)
	}
	if strings.TrimSpace(message) != "" {
		fragment.Set("wechat_error", message)
	}
	redirectURL.Fragment = fragment.Encode()
	ctx.Redirect(http.StatusFound, redirectURL.String())
}

func randomHex(byteLength int) (string, error) {
	buffer := make([]byte, byteLength)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}
