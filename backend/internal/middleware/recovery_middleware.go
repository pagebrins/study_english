package middleware

import (
	"net/http"
	"runtime/debug"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/pkg/response"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Recovery catches panic and returns standard response.
func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(ctx *gin.Context, recovered any) {
		logger.L().Error("panic recovered",
			zap.String("request_id", GetRequestID(ctx)),
			zap.Any("panic", recovered),
			zap.ByteString("stack", debug.Stack()),
		)
		response.JSON(ctx, http.StatusInternalServerError, "internal server error", nil)
		ctx.Abort()
	})
}
