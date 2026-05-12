package handler

import (
	"net/http"
	"strconv"
	"time"

	"study_english/backend/internal/middleware"
	"study_english/backend/internal/model"
	wordexport "study_english/backend/internal/pkg/export"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/pkg/response"
	"study_english/backend/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// WordHandler handles word knowledge base endpoints.
type WordHandler struct {
	service *service.WordService
}

// NewWordHandler creates word handler.
func NewWordHandler(service *service.WordService) *WordHandler {
	return &WordHandler{service: service}
}

func (h *WordHandler) List(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var query struct {
		Word       *string `form:"word"`
		L1Category *string `form:"l1_category"`
		L2Category *string `form:"l2_category"`
		Tag        *string `form:"tag"`
	}
	if err := ctx.ShouldBindQuery(&query); err != nil {
		logger.L().Error("word list bind query failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	items, err := h.service.List(requestID, query.Word, query.L1Category, query.L2Category, query.Tag)
	if err != nil {
		logger.L().Error("word list failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", items)
}

func (h *WordHandler) Export(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var query struct {
		Word       *string `form:"word"`
		L1Category *string `form:"l1_category"`
		L2Category *string `form:"l2_category"`
		Tag        *string `form:"tag"`
	}
	if err := ctx.ShouldBindQuery(&query); err != nil {
		logger.L().Error("word export bind query failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	items, err := h.service.List(requestID, query.Word, query.L1Category, query.L2Category, query.Tag)
	if err != nil {
		logger.L().Error("word export list failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	fileBytes, err := wordexport.BuildWordWorkbook(items)
	if err != nil {
		logger.L().Error("word export build xlsx failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusInternalServerError, "failed to build xlsx", nil)
		return
	}

	filename := "words-" + time.Now().Format("20060102-150405") + ".xlsx"
	ctx.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	ctx.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
	ctx.Header("Content-Length", strconv.Itoa(len(fileBytes)))
	ctx.Writer.WriteHeader(http.StatusOK)
	_, _ = ctx.Writer.Write(fileBytes)
}

func (h *WordHandler) Create(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	var word model.Word
	if err := ctx.ShouldBindJSON(&word); err != nil {
		logger.L().Error("word create bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	if err := h.service.Create(requestID, &word); err != nil {
		logger.L().Error("word create failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", word)
}

func (h *WordHandler) Update(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		response.JSON(ctx, http.StatusBadRequest, "invalid word id", nil)
		return
	}
	var word model.Word
	if err := ctx.ShouldBindJSON(&word); err != nil {
		logger.L().Error("word update bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	word.ID = uint(id)
	if err := h.service.Update(requestID, &word); err != nil {
		logger.L().Error("word update failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", word)
}

func (h *WordHandler) Delete(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		response.JSON(ctx, http.StatusBadRequest, "invalid word id", nil)
		return
	}
	if err := h.service.Delete(requestID, uint(id)); err != nil {
		logger.L().Error("word delete failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", true)
}
