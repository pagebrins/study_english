package handler

import (
	"net/http"
	"strconv"

	"study_english/backend/internal/middleware"
	"study_english/backend/internal/model"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/pkg/response"
	"study_english/backend/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ModeHandler handles study mode endpoints.
type ModeHandler struct {
	service *service.ModeService
}

// NewModeHandler creates mode handler.
func NewModeHandler(service *service.ModeService) *ModeHandler { return &ModeHandler{service: service} }

func (h *ModeHandler) List(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	var query struct {
		Type *int `form:"type"`
		Mode *int `form:"mode"`
	}
	if err := ctx.ShouldBindQuery(&query); err != nil {
		logger.L().Error("mode list bind query failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	if query.Type != nil && (*query.Type < 1 || *query.Type > 3) {
		response.JSON(ctx, http.StatusBadRequest, "type must be 1, 2 or 3", nil)
		return
	}
	if query.Mode != nil && (*query.Mode < 1 || *query.Mode > 2) {
		response.JSON(ctx, http.StatusBadRequest, "mode must be 1 or 2", nil)
		return
	}
	logger.L().Info("mode list request", zap.String("request_id", requestID), zap.Uint("user_id", userID))
	modes, err := h.service.List(requestID, userID, query.Type, query.Mode)
	if err != nil {
		logger.L().Error("mode list failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusInternalServerError, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", modes)
}

func (h *ModeHandler) Create(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	var mode model.Mode
	if err := ctx.ShouldBindJSON(&mode); err != nil {
		logger.L().Error("mode create bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	mode.UserID = userID
	if err := h.service.Create(requestID, &mode); err != nil {
		logger.L().Error("mode create failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", mode)
}

func (h *ModeHandler) Update(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		logger.L().Error("mode update invalid id", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, "invalid mode id", nil)
		return
	}
	var mode model.Mode
	if err := ctx.ShouldBindJSON(&mode); err != nil {
		logger.L().Error("mode update bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	mode.ID, mode.UserID = uint(id), userID
	if err := h.service.Update(requestID, &mode); err != nil {
		logger.L().Error("mode update failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", mode)
}

func (h *ModeHandler) Delete(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		logger.L().Error("mode delete invalid id", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, "invalid mode id", nil)
		return
	}
	if err := h.service.Delete(requestID, uint(id), userID); err != nil {
		logger.L().Error("mode delete failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusInternalServerError, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", true)
}
