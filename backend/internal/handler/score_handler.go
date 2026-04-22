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

// ScoreHandler handles score endpoints.
type ScoreHandler struct {
	service *service.ScoreService
}

// NewScoreHandler creates score handler.
func NewScoreHandler(service *service.ScoreService) *ScoreHandler {
	return &ScoreHandler{service: service}
}

func (h *ScoreHandler) Today(ctx *gin.Context) {
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
		logger.L().Error("score today bind query failed", zap.String("request_id", requestID), zap.Error(err))
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
	logger.L().Info("score today request", zap.String("request_id", requestID), zap.Uint("user_id", userID))
	score, err := h.service.Today(requestID, userID, query.Type, query.Mode)
	if err != nil {
		logger.L().Error("score today failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusInternalServerError, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", score)
}

func (h *ScoreHandler) Recalculate(ctx *gin.Context) { h.Today(ctx) }
