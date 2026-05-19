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

// PronunciationHandler handles pronunciation resources.
type PronunciationHandler struct {
	service *service.PronunciationService
}

// NewPronunciationHandler creates pronunciation handler.
func NewPronunciationHandler(service *service.PronunciationService) *PronunciationHandler {
	return &PronunciationHandler{service: service}
}

func (h *PronunciationHandler) Build(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var req struct {
		Text string `json:"text" binding:"required"`
		Lang string `json:"lang" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("pronunciation build bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	item, err := h.service.Build(req.Text, req.Lang)
	if err != nil {
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", item)
}

func (h *PronunciationHandler) Stream(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	text := ctx.Query("text")
	lang := ctx.DefaultQuery("lang", "en")
	audioURL, err := h.service.GoogleTTSURL(text, lang)
	if err != nil {
		logger.L().Warn("pronunciation stream rejected", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	ctx.Redirect(http.StatusFound, audioURL)
}
