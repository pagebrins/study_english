package middleware

import (
	"time"

	"study_english/backend/internal/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RequestLogger logs every HTTP request with a consistent request id.
func RequestLogger() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		start := time.Now()
		ctx.Next()

		requestID := GetRequestID(ctx)
		fields := []zap.Field{
			zap.String("request_id", requestID),
			zap.String("method", ctx.Request.Method),
			zap.String("path", ctx.Request.URL.Path),
			zap.String("query", ctx.Request.URL.RawQuery),
			zap.Int("status", ctx.Writer.Status()),
			zap.Int64("latency_ms", time.Since(start).Milliseconds()),
			zap.String("client_ip", ctx.ClientIP()),
		}
		if len(ctx.Errors) > 0 {
			fields = append(fields, zap.String("error", ctx.Errors.String()))
		}

		status := ctx.Writer.Status()
		switch {
		case status >= 500:
			logger.L().Error("http request", fields...)
		case status >= 400:
			logger.L().Warn("http request", fields...)
		default:
			logger.L().Info("http request", fields...)
		}
	}
}
