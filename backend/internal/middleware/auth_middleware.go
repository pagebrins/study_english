package middleware

import (
	"net/http"
	"strings"

	"study_english/backend/internal/pkg/auth"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/pkg/response"
	"study_english/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Auth validates bearer token and injects user id.
func Auth(secret string, repo *repository.Repository) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		requestID := GetRequestID(ctx)
		header := ctx.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			logger.L().Warn("auth middleware missing token", zap.String("request_id", requestID))
			response.JSON(ctx, http.StatusUnauthorized, "missing token", nil)
			ctx.Abort()
			return
		}
		token := strings.TrimPrefix(header, "Bearer ")
		claims, err := auth.ParseToken(token, secret)
		if err != nil {
			logger.L().Error("auth middleware parse token failed", zap.String("request_id", requestID), zap.Error(err))
			response.JSON(ctx, http.StatusUnauthorized, "invalid token", nil)
			ctx.Abort()
			return
		}
		logger.L().Info("auth middleware success", zap.String("request_id", requestID), zap.Uint("user_id", claims.UserID))
		ctx.Set("user_id", claims.UserID)
		if repo != nil {
			role, roleErr := repo.GetUserRole(requestID, claims.UserID)
			if roleErr != nil {
				logger.L().Error("auth middleware get user role failed", zap.String("request_id", requestID), zap.Error(roleErr))
				response.JSON(ctx, http.StatusUnauthorized, "invalid user role", nil)
				ctx.Abort()
				return
			}
			permissions, permErr := repo.ListUserPermissionCodes(requestID, claims.UserID)
			if permErr != nil {
				logger.L().Error("auth middleware get user permissions failed", zap.String("request_id", requestID), zap.Error(permErr))
				response.JSON(ctx, http.StatusUnauthorized, "invalid user permission", nil)
				ctx.Abort()
				return
			}
			ctx.Set("role_code", role.Code)
			ctx.Set("permissions", permissions)
		}
		ctx.Next()
	}
}
