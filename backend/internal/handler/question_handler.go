package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"study_english/backend/internal/middleware"
	"study_english/backend/internal/model"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/pkg/response"
	"study_english/backend/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// QuestionHandler handles question endpoints.
type QuestionHandler struct {
	service *service.QuestionService
}

const dateLayout = "2006-01-02"

// NewQuestionHandler creates question handler.
func NewQuestionHandler(service *service.QuestionService) *QuestionHandler {
	return &QuestionHandler{service: service}
}

func (h *QuestionHandler) Generate(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	var req struct {
		ModeID uint `json:"mode_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("questions generate bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	logger.L().Info("questions generate request", zap.String("request_id", requestID), zap.Uint("mode_id", req.ModeID))
	items, err := h.service.Generate(requestID, userID, req.ModeID)
	if err != nil {
		logger.L().Error("questions generate failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", items)
}

func (h *QuestionHandler) GenerateStream(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	var req struct {
		ModeID uint `json:"mode_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("questions generate stream bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	ctx.Writer.Header().Set("Content-Type", "text/event-stream")
	ctx.Writer.Header().Set("Cache-Control", "no-cache")
	ctx.Writer.Header().Set("Connection", "keep-alive")
	ctx.Writer.Header().Set("X-Accel-Buffering", "no")
	flusher, ok := ctx.Writer.(http.Flusher)
	if !ok {
		response.JSON(ctx, http.StatusInternalServerError, "streaming is not supported", nil)
		return
	}

	writeEvent := func(event string, payload any) error {
		data, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		if _, err := fmt.Fprintf(ctx.Writer, "event: %s\ndata: %s\n\n", event, data); err != nil {
			return err
		}
		flusher.Flush()
		return nil
	}

	items, err := h.service.GenerateStream(
		ctx.Request.Context(),
		requestID,
		userID,
		req.ModeID,
		func(chunk string) error {
			return writeEvent("token", gin.H{"text": chunk})
		},
		func(meta service.StreamMeta) error {
			return writeEvent("meta", meta)
		},
	)
	if err != nil {
		logger.L().Error("questions generate stream failed", zap.String("request_id", requestID), zap.Error(err))
		_ = writeEvent("error", gin.H{"message": err.Error()})
		return
	}
	_ = writeEvent("final", gin.H{"items": items})
	_ = writeEvent("done", gin.H{"ok": true})
}

func (h *QuestionHandler) Analyze(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	var req struct {
		ModeID     uint   `json:"mode_id" binding:"required"`
		Question   string `json:"question" binding:"required"`
		AnswerText string `json:"answer_text" binding:"required"`
		AnswerKey  string `json:"answer_key" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("questions analyze bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	logger.L().Info("questions analyze request", zap.String("request_id", requestID))
	issues, err := h.service.AnalyzeAnswer(requestID, userID, req.ModeID, req.Question, req.AnswerText, req.AnswerKey)
	if err != nil {
		logger.L().Error("questions analyze failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", issues)
}

func (h *QuestionHandler) ExplainChat(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	var req service.ExplainChatParams
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logger.L().Error("questions explain chat bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	if strings.TrimSpace(req.UserMessage) == "" {
		response.JSON(ctx, http.StatusBadRequest, "user_message is required", nil)
		return
	}
	if req.QuestionIndex != nil && *req.QuestionIndex <= 0 {
		response.JSON(ctx, http.StatusBadRequest, "question_index must be greater than 0", nil)
		return
	}
	if req.PageContext.StudyType != nil && (*req.PageContext.StudyType < 1 || *req.PageContext.StudyType > 3) {
		response.JSON(ctx, http.StatusBadRequest, "study_type must be 1, 2 or 3", nil)
		return
	}
	if req.PageContext.TranslationMode != nil && (*req.PageContext.TranslationMode < 1 || *req.PageContext.TranslationMode > 2) {
		response.JSON(ctx, http.StatusBadRequest, "translation_mode must be 1 or 2", nil)
		return
	}

	result, err := h.service.ExplainChat(requestID, userID, req)
	if err != nil {
		logger.L().Error("questions explain chat failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", result)
}

func (h *QuestionHandler) List(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	var query struct {
		StartDate string `form:"start_date"`
		EndDate   string `form:"end_date"`
		ModeIDs   string `form:"mode_ids"`
		Type      *int   `form:"type"`
		Mode      *int   `form:"mode"`
		MinScore  *int   `form:"min_score"`
		MaxScore  *int   `form:"max_score"`
	}
	if err := ctx.ShouldBindQuery(&query); err != nil {
		logger.L().Error("questions list bind query failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}

	filters := service.QuestionListParams{
		StudyType:       query.Type,
		TranslationMode: query.Mode,
		MinScore:        query.MinScore,
		MaxScore:        query.MaxScore,
	}
	if filters.StudyType != nil && (*filters.StudyType < 1 || *filters.StudyType > 3) {
		response.JSON(ctx, http.StatusBadRequest, "type must be 1, 2 or 3", nil)
		return
	}
	if filters.TranslationMode != nil && (*filters.TranslationMode < 1 || *filters.TranslationMode > 2) {
		response.JSON(ctx, http.StatusBadRequest, "mode must be 1 or 2", nil)
		return
	}
	if filters.MinScore != nil && filters.MaxScore != nil && *filters.MinScore > *filters.MaxScore {
		response.JSON(ctx, http.StatusBadRequest, "min_score cannot be greater than max_score", nil)
		return
	}
	if query.StartDate != "" {
		startDate, err := time.ParseInLocation(dateLayout, query.StartDate, time.Local)
		if err != nil {
			response.JSON(ctx, http.StatusBadRequest, "invalid start_date format, expected YYYY-MM-DD", nil)
			return
		}
		filters.StartDate = &startDate
	}
	if query.EndDate != "" {
		endDate, err := time.ParseInLocation(dateLayout, query.EndDate, time.Local)
		if err != nil {
			response.JSON(ctx, http.StatusBadRequest, "invalid end_date format, expected YYYY-MM-DD", nil)
			return
		}
		endExclusive := endDate.AddDate(0, 0, 1)
		filters.EndDateExclusive = &endExclusive
	}
	if filters.StartDate != nil && filters.EndDateExclusive != nil && !filters.StartDate.Before(*filters.EndDateExclusive) {
		response.JSON(ctx, http.StatusBadRequest, "start_date cannot be later than end_date", nil)
		return
	}
	if query.ModeIDs != "" {
		rawIDs := strings.Split(query.ModeIDs, ",")
		parsedModeIDs := make([]uint, 0, len(rawIDs))
		for _, rawID := range rawIDs {
			idText := strings.TrimSpace(rawID)
			if idText == "" {
				continue
			}
			modeID, err := strconv.ParseUint(idText, 10, 64)
			if err != nil {
				response.JSON(ctx, http.StatusBadRequest, "invalid mode_ids value", nil)
				return
			}
			parsedModeIDs = append(parsedModeIDs, uint(modeID))
		}
		filters.ModeIDs = parsedModeIDs
	}

	items, err := h.service.List(requestID, userID, filters)
	if err != nil {
		logger.L().Error("questions list failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusInternalServerError, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", items)
}

func (h *QuestionHandler) Create(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	var question model.UserQuestion
	if err := ctx.ShouldBindJSON(&question); err != nil {
		logger.L().Error("questions create bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	question.UserID = userID
	if err := h.service.Create(requestID, &question); err != nil {
		logger.L().Error("questions create failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", question)
}

func (h *QuestionHandler) Update(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		logger.L().Error("questions update invalid id", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, "invalid question id", nil)
		return
	}
	var question model.UserQuestion
	if err := ctx.ShouldBindJSON(&question); err != nil {
		logger.L().Error("questions update bind failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	question.ID, question.UserID = uint(id), userID
	if err := h.service.Update(requestID, &question); err != nil {
		logger.L().Error("questions update failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", question)
}

func (h *QuestionHandler) Delete(ctx *gin.Context) {
	requestID := middleware.GetRequestID(ctx)
	userID, ok := getUserID(ctx)
	if !ok {
		return
	}
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		logger.L().Error("questions delete invalid id", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusBadRequest, "invalid question id", nil)
		return
	}
	if err := h.service.Delete(requestID, uint(id), userID); err != nil {
		logger.L().Error("questions delete failed", zap.String("request_id", requestID), zap.Error(err))
		response.JSON(ctx, http.StatusInternalServerError, err.Error(), nil)
		return
	}
	response.JSON(ctx, http.StatusOK, "ok", true)
}
