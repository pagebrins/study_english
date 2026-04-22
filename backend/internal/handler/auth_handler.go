package handler

import (
	"net/http"

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

func (h *AuthHandler) Register(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		Name     string `json:"name" binding:"required"`
		Phone    string `json:"phone"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("auth register bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	logger.L().Info("auth register request", zap.String("request_id", requestID), zap.String("email", req.Email))
	token, user, err := h.service.Register(requestID, req.Email, req.Password, req.Name, req.Phone)
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
