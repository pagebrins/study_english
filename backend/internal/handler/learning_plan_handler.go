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

// LearningPlanHandler handles auto study plan endpoints.
type LearningPlanHandler struct {
	service *service.LearningPlanService
}

// NewLearningPlanHandler creates learning plan handler.
func NewLearningPlanHandler(service *service.LearningPlanService) *LearningPlanHandler {
	return &LearningPlanHandler{service: service}
}

func (h *LearningPlanHandler) Current(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	result, err := h.service.GetCurrent(requestID, userID)
	if err != nil {
		logger.L().Error("learning plan current failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusInternalServerError, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", result)
}

func (h *LearningPlanHandler) SetGoal(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	var req service.SetLearningGoalParams
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("learning goal bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	result, err := h.service.SetGoal(requestID, userID, req)
	if err != nil {
		logger.L().Error("learning goal set failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", result)
}

func (h *LearningPlanHandler) SubmitAssessment(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	var req service.SubmitLearningAssessmentParams
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("learning assessment submit bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	result, err := h.service.SubmitAssessment(requestID, userID, req)
	if err != nil {
		logger.L().Error("learning assessment submit failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", result)
}

func (h *LearningPlanHandler) GeneratePlan(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	result, err := h.service.GeneratePlan(requestID, userID)
	if err != nil {
		logger.L().Error("learning plan generate failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", result)
}
