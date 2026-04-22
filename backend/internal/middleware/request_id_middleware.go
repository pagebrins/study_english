package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"strings"
	"study_english/backend/internal/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

const requestIDKey = "request_id"

// RequestID injects request id into context and response header.
func RequestID() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		requestID := strings.TrimSpace(ctx.GetHeader("X-Request-Id"))
		if requestID == "" {
			requestID = strings.TrimSpace(ctx.GetHeader("X-Request-ID"))
		}
		if requestID == "" {
			requestID = generateRequestID()
		}
		ctx.Set(requestIDKey, requestID)
		ctx.Writer.Header().Set("X-Request-Id", requestID)
		ctx.Next()
	}
}

// GetRequestID gets request id from context.
func GetRequestID(ctx *gin.Context) string {
	if value, ok := ctx.Get(requestIDKey); ok {
		if requestID, ok := value.(string); ok && requestID != "" {
			return requestID
		}
	}
	return "-"
}

func generateRequestID() string {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		logger.L().Error("generate request id failed", zap.String("request_id", "-"), zap.Error(err))
		return "req-fallback"
	}
	return hex.EncodeToString(buf)
}
