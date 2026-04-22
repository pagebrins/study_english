package handler

import (
	"net/http"
	"strconv"

	"study_english/backend/internal/middleware"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/pkg/response"
	"study_english/backend/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// PermissionHandler handles RBAC settings endpoints.
type PermissionHandler struct {
	service *service.PermissionService
}

// NewPermissionHandler creates permission handler.
func NewPermissionHandler(service *service.PermissionService) *PermissionHandler {
	return &PermissionHandler{service: service}
}

func (h *PermissionHandler) Snapshot(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	result, err := h.service.Snapshot(requestID)
	if err != nil {
		logger.L().Error("permission snapshot failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusInternalServerError, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", result)
}

func (h *PermissionHandler) ListUserRoles(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	result, err := h.service.ListUserRoles(requestID)
	if err != nil {
		logger.L().Error("list user roles failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusInternalServerError, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", result)
}

func (h *PermissionHandler) UpdateUserRole(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userIDRaw, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || userIDRaw <= 0 {
		response.JSON(ctx, http.StatusBadRequest, "invalid user id", nil)
		return
	}
	var req struct {
		RoleID uint `json:"role_id" binding:"required"`
	}
	if bindErr := ctx.ShouldBindJSON(&req); bindErr != nil {
		response.JSON(ctx, http.StatusBadRequest, bindErr.Error(), nil)
		return
	}
	if req.RoleID == 0 {
		response.JSON(ctx, http.StatusBadRequest, "role_id is required", nil)
		return
	}
	if err := h.service.UpdateUserRole(requestID, uint(userIDRaw), req.RoleID); err != nil {
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", true)
}

func (h *PermissionHandler) UpdateRolePermissions(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	roleIDRaw, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || roleIDRaw <= 0 {
		response.JSON(ctx, http.StatusBadRequest, "invalid role id", nil)
		return
	}
	var req struct {
		PermissionIDs []uint `json:"permission_ids"`
	}
	if bindErr := ctx.ShouldBindJSON(&req); bindErr != nil {
		response.JSON(ctx, http.StatusBadRequest, bindErr.Error(), nil)
		return
	}
	if err := h.service.UpdateRolePermissions(requestID, uint(roleIDRaw), req.PermissionIDs); err != nil {
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", true)
}
