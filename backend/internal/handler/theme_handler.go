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

// ThemeHandler handles global themes endpoints.
type ThemeHandler struct {
	service *service.ThemeService
}

// NewThemeHandler creates theme handler.
func NewThemeHandler(service *service.ThemeService) *ThemeHandler {
	return &ThemeHandler{service: service}
}

func (h *ThemeHandler) List(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var query struct {
		ParentID *uint `form:"parent_id"`
		Level    *int  `form:"level"`
		All      bool  `form:"all"`
	}
	if err := ctx.ShouldBindQuery(&query); err != nil {
		logger.L().Error("theme list bind query failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	items, err := h.service.List(requestID, query.ParentID, query.Level, query.All)
	if err != nil {
		logger.L().Error("theme list failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", items)
}

func (h *ThemeHandler) Create(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var theme model.Theme
	if err := ctx.ShouldBindJSON(&theme); err != nil {
		logger.L().Error("theme create bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	if err := h.service.Create(requestID, &theme); err != nil {
		logger.L().Error("theme create failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", theme)
}

func (h *ThemeHandler) Update(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		response.JSON(ctx, http.StatusBadRequest, "invalid theme id", nil)
		return
	}
	var theme model.Theme
	if err := ctx.ShouldBindJSON(&theme); err != nil {
		logger.L().Error("theme update bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	theme.ID = uint(id)
	if err := h.service.Update(requestID, &theme); err != nil {
		logger.L().Error("theme update failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", theme)
}

func (h *ThemeHandler) Delete(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		response.JSON(ctx, http.StatusBadRequest, "invalid theme id", nil)
		return
	}
	if err := h.service.Delete(requestID, uint(id)); err != nil {
		logger.L().Error("theme delete failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", true)
}
