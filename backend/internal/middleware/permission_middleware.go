package middleware

import (
	"net/http"
	"strings"

	"study_english/backend/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

// RequirePermission checks if user has specific permission code.
func RequirePermission(permissionCode string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		rawPermissions, ok := ctx.Get("permissions")
		if !ok {
			response.JSON(ctx, http.StatusForbidden, "forbidden", nil)
			ctx.Abort()
			return
		}
		permissionList, ok := rawPermissions.([]string)
		if !ok {
			response.JSON(ctx, http.StatusForbidden, "forbidden", nil)
			ctx.Abort()
			return
		}
		if hasPermission(permissionList, permissionCode) {
			ctx.Next()
			return
		}
		response.JSON(ctx, http.StatusForbidden, "forbidden", nil)
		ctx.Abort()
	}
}

func hasPermission(permissions []string, required string) bool {
	for _, permission := range permissions {
		if permission == required {
			return true
		}
		if strings.HasSuffix(permission, ".*") {
			prefix := strings.TrimSuffix(permission, "*")
			if strings.HasPrefix(required, prefix) {
				return true
			}
		}
	}
	return false
}
