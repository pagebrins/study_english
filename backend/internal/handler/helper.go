package handler

import (
	"net/http"

	"study_english/backend/internal/middleware"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/pkg/response"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func getUserID(ctx *gin.Context) (uint, bool) {
	requestID := middleware.GetRequestID(ctx)
	value, ok := ctx.Get("user_id")
	if !ok {
		logger.L().Error("get user id failed: missing user_id in context", zap.String("request_id", requestID))
		response.JSON(ctx, http.StatusUnauthorized, "unauthorized", nil)
		return 0, false
	}
	userID, ok := value.(uint)
	if !ok {
		logger.L().Error("get user id failed: invalid user_id type", zap.String("request_id", requestID))
		response.JSON(ctx, http.StatusUnauthorized, "unauthorized", nil)
		return 0, false
	}
	return userID, true
}
