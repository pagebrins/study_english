package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
	"study_english/backend/internal/model"
	llmclient "study_english/backend/internal/pkg/llm"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/repository"
)

// GeneratedQuestion is LLM generation response.
type GeneratedQuestion struct {
	Question       string `json:"question"`
	AnswerKey      string `json:"answer_key"`
	PreGeneratedID *uint  `json:"pre_generated_id,omitempty"`
}

// QuestionService handles question business logic.
type QuestionService struct {
	repo                    *repository.Repository
	apiKey                  string
	endpoint                string
	generateModel           string
	analyzeModel            string
	chatModel               string
	promptFile              string
	analyzePromptFile       string
	analyzeRepairPromptFile string
	chatPromptFile          string
	streamEnabled           bool
	generateLLM             *llmclient.Client
	analyzeLLM              *llmclient.Client
	chatLLM                 *llmclient.Client
	preheatEnabled          bool
	preheatInterval         time.Duration
	preheatTimeout          time.Duration
	preheatTargetWS         int
	preheatTargetArt        int
	chatSessionMu           sync.Mutex
	chatSessions            map[string][]chatMessageRecord
	chatSessionAccess       map[string]time.Time
}

type QuestionListParams struct {
	StartDate        *time.Time
	EndDateExclusive *time.Time
	ModeIDs          []uint
	StudyType        *int
	TranslationMode  *int
	MinScore         *int
	MaxScore         *int
}

type ExplainChatQuestionSnapshot struct {
	QuestionID *uint  `json:"question_id,omitempty"`
	Index      *int   `json:"index,omitempty"`
	Question   string `json:"question"`
	AnswerKey  string `json:"answer_key"`
	UserAnswer string `json:"user_answer"`
}

type ExplainChatPageContext struct {
	Page                 string                        `json:"page"`
	ModeID               *uint                         `json:"mode_id,omitempty"`
	StudyType            *int                          `json:"study_type,omitempty"`
	TranslationMode      *int                          `json:"translation_mode,omitempty"`
	CurrentQuestionIndex *int                          `json:"current_question_index,omitempty"`
	QuestionSnapshots    []ExplainChatQuestionSnapshot `json:"question_snapshots,omitempty"`
}

type ExplainChatParams struct {
	SessionID     string                 `json:"session_id"`
	QuestionIndex *int                   `json:"question_index,omitempty"`
	UserMessage   string                 `json:"user_message"`
	PageContext   ExplainChatPageContext `json:"page_context"`
}

type ExplainChatResult struct {
	SessionID        string                       `json:"session_id"`
	AssistantMessage string                       `json:"assistant_message"`
	ResolvedQuestion *ExplainChatQuestionSnapshot `json:"resolved_question,omitempty"`
}

type chatMessageRecord struct {
	Role    string
	Content string
}

const (
	maxGenerateRounds      = 3
	maxExcludeInPrompt     = 100
	maxCustomReqsInPrompt  = 3
	chatWindowSize         = 8
	chatSessionTTL         = 30 * time.Minute
	defaultPreheatInterval = 10 * time.Second
	defaultPreheatTimeout  = 30 * time.Minute

	studyTypeWord     = 1
	studyTypeSentence = 2
	studyTypeArticle  = 3

	translationModeZhToEn = 1
	translationModeEnToZh = 2

	preGeneratedStatusReady  = "ready"
	preGeneratedStatusServed = "served"

	defaultPreheatTargetWS  = 100
	defaultPreheatTargetArt = 3

	llmTaskGenerate = "generate_questions"
	llmTaskAnalyze  = "submit_answer"
	llmTaskChat     = "chat"

	maxAnalyzeParseRetries = 2
)

// NewQuestionService creates question service.
func NewQuestionService(
	repo *repository.Repository,
	apiKey,
	endpoint,
	generateModel,
	analyzeModel,
	chatModel,
	promptFile,
	analyzePromptFile string,
	analyzeRepairPromptFile string,
	chatPromptFile string,
	streamEnabled bool,
	preheatEnabled bool,
	preheatIntervalSec int,
	preheatServeTimeoutM int,
	preheatTargetWS int,
	preheatTargetArticle int,
) *QuestionService {
	generateClient := initQuestionLLMClient(endpoint, generateModel, apiKey, llmTaskGenerate)
	analyzeClient := initQuestionLLMClient(endpoint, analyzeModel, apiKey, llmTaskAnalyze)
	chatClient := initQuestionLLMClient(endpoint, chatModel, apiKey, llmTaskChat)
	service := &QuestionService{
		repo:                    repo,
		apiKey:                  apiKey,
		endpoint:                endpoint,
		generateModel:           generateModel,
		analyzeModel:            analyzeModel,
		chatModel:               chatModel,
		promptFile:              promptFile,
		analyzePromptFile:       analyzePromptFile,
		analyzeRepairPromptFile: analyzeRepairPromptFile,
		chatPromptFile:          chatPromptFile,
		streamEnabled:           streamEnabled,
		generateLLM:             generateClient,
		analyzeLLM:              analyzeClient,
		chatLLM:                 chatClient,
		preheatEnabled:          preheatEnabled,
		preheatInterval:         withDefaultDuration(time.Duration(preheatIntervalSec)*time.Second, defaultPreheatInterval),
		preheatTimeout:          withDefaultDuration(time.Duration(preheatServeTimeoutM)*time.Minute, defaultPreheatTimeout),
		preheatTargetWS:         withDefaultInt(preheatTargetWS, defaultPreheatTargetWS),
		preheatTargetArt:        withDefaultInt(preheatTargetArticle, defaultPreheatTargetArt),
		chatSessions:            make(map[string][]chatMessageRecord),
		chatSessionAccess:       make(map[string]time.Time),
	}
	service.startPreheatTicker()
	return service
}

func initQuestionLLMClient(endpoint, modelName, apiKey, taskType string) *llmclient.Client {
	client, err := llmclient.NewClient(endpoint, modelName, apiKey, 0.7)
	if err != nil {
		logger.L().Error("init langchain llm client failed",
			zap.String("request_id", "-"),
			zap.String("task_type", taskType),
			zap.String("model", strings.TrimSpace(modelName)),
			zap.Error(err),
		)
		return nil
	}
	return client
}

func (s *QuestionService) resolveLLMClient(taskType string) (*llmclient.Client, string, error) {
	switch taskType {
	case llmTaskGenerate:
		if strings.TrimSpace(s.generateModel) == "" {
			return nil, "", errors.New("llm model for generate_questions is not configured")
		}
		return s.generateLLM, s.generateModel, nil
	case llmTaskAnalyze:
		if strings.TrimSpace(s.analyzeModel) == "" {
			return nil, "", errors.New("llm model for submit_answer is not configured")
		}
		return s.analyzeLLM, s.analyzeModel, nil
	case llmTaskChat:
		if strings.TrimSpace(s.chatModel) == "" {
			return nil, "", errors.New("llm model for chat is not configured")
		}
		return s.chatLLM, s.chatModel, nil
	default:
		return nil, "", fmt.Errorf("unsupported llm task type: %s", taskType)
	}
}

func (s *QuestionService) Generate(requestID string, userID, modeID uint) ([]GeneratedQuestion, error) {
	startedAt := time.Now()
	logger.L().Info("llm generate start",
		zap.String("request_id", requestID),
		zap.Uint("user_id", userID),
		zap.Uint("mode_id", modeID),
	)
	mode, err := s.repo.GetModeByID(requestID, modeID, userID)
	if err != nil {
		logger.L().Error("llm generate failed get mode", zap.String("request_id", requestID), zap.Error(err))
		return nil, errors.New("mode not found")
	}
	if s.endpoint == "" || s.generateModel == "" {
		logger.L().Error("llm generate failed missing config", zap.String("request_id", requestID))
		return nil, errors.New("llm is not configured: please set LLM_ENDPOINT and LLM_MODEL_GENERATE_QUESTIONS")
	}
	generated, err := s.generateWithPreheat(context.Background(), requestID, userID, mode, nil, nil)
	if err != nil {
		return nil, err
	}
	if len(generated) == 0 {
		logger.L().Error("llm generate empty result", zap.String("request_id", requestID))
		return nil, errors.New("llm returned empty questions")
	}
	logger.L().Info("llm generate completed",
		zap.String("request_id", requestID),
		zap.Int64("generate_latency_ms", time.Since(startedAt).Milliseconds()),
	)
	return generated, nil
}

// StreamMeta represents stream progress for one generation round.
type StreamMeta struct {
	RetryRound int `json:"retry_round"`
	RawCount   int `json:"raw_generated_count"`
	Filtered   int `json:"filtered_count"`
	FinalCount int `json:"final_count"`
}

// GenerateStream generates questions with stream tokens and progress callback.
func (s *QuestionService) GenerateStream(
	ctx context.Context,
	requestID string,
	userID, modeID uint,
	onToken func(string) error,
	onMeta func(StreamMeta) error,
) ([]GeneratedQuestion, error) {
	if !s.streamEnabled {
		return nil, errors.New("llm stream is disabled")
	}
	logger.L().Info("llm generate stream start",
		zap.String("request_id", requestID),
		zap.Uint("user_id", userID),
		zap.Uint("mode_id", modeID),
	)
	mode, err := s.repo.GetModeByID(requestID, modeID, userID)
	if err != nil {
		logger.L().Error("llm generate stream failed get mode", zap.String("request_id", requestID), zap.Error(err))
		return nil, errors.New("mode not found")
	}
	return s.generateWithPreheat(ctx, requestID, userID, mode, onToken, onMeta)
}

func (s *QuestionService) List(requestID string, userID uint, params QuestionListParams) ([]model.UserQuestion, error) {
	return s.repo.ListQuestions(
		requestID,
		userID,
		params.StartDate,
		params.EndDateExclusive,
		params.ModeIDs,
		params.StudyType,
		params.TranslationMode,
		params.MinScore,
		params.MaxScore,
	)
}
func (s *QuestionService) Create(requestID string, question *model.UserQuestion) error {
	question.CreateTime = time.Now()
	if err := s.repo.CreateQuestion(requestID, question); err != nil {
		return err
	}
	if question.PreGeneratedID != nil {
		if err := s.repo.DeleteServedPreGeneratedQuestion(requestID, *question.PreGeneratedID, question.UserID, question.ModeID); err != nil {
			return err
		}
	}
	return nil
}
func (s *QuestionService) Update(requestID string, question *model.UserQuestion) error {
	return s.repo.UpdateQuestion(requestID, question)
}
func (s *QuestionService) Delete(requestID string, id, userID uint) error {
	return s.repo.DeleteQuestion(requestID, id, userID)
}

// AnalyzeAnswer analyzes student's translation mistakes.
func (s *QuestionService) AnalyzeAnswer(requestID string, userID, modeID uint, question, answerText, answerKey string) ([]string, error) {
	logger.L().Info("llm analyze start",
		zap.String("request_id", requestID),
		zap.Int("question_len", len(question)),
		zap.Int("answer_len", len(answerText)),
	)
	mode, err := s.repo.GetModeByID(requestID, modeID, userID)
	if err != nil {
		logger.L().Error("llm analyze failed get mode", zap.String("request_id", requestID), zap.Error(err))
		return nil, errors.New("mode not found")
	}
	if s.endpoint == "" || s.analyzeModel == "" {
		logger.L().Error("llm analyze failed missing config", zap.String("request_id", requestID))
		return nil, errors.New("llm is not configured: please set LLM_ENDPOINT and LLM_MODEL_SUBMIT_ANSWER")
	}
	prompt, err := s.buildAnalyzePrompt(question, answerText, answerKey, mode.Type, mode.Mode)
	if err != nil {
		logger.L().Error("llm analyze build prompt failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	content, err := s.callLLMRawContent(context.Background(), requestID, llmTaskAnalyze, prompt, nil)
	if err != nil {
		logger.L().Error("llm analyze call failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}
	issues, parseErr := parseAnalyzeOutputSafely(content)
	if parseErr != nil {
		logger.L().Warn("llm analyze parse failed, try retry parse",
			zap.String("request_id", requestID),
			zap.Error(parseErr),
		)
		issues, parseErr = s.retryParseAnalyzeOutput(context.Background(), requestID, prompt, content)
		if parseErr != nil {
			logger.L().Error("llm analyze parse failed after retries", zap.String("request_id", requestID), zap.Error(parseErr))
			return nil, parseErr
		}
	}
	if issues == nil {
		return []string{}, nil
	}
	return issues, nil
}

func (s *QuestionService) ExplainChat(
	requestID string,
	userID uint,
	params ExplainChatParams,
) (ExplainChatResult, error) {
	sessionID := strings.TrimSpace(params.SessionID)
	if sessionID == "" {
		sessionID = fmt.Sprintf("s-%d-%d", userID, time.Now().UnixNano())
	}
	userMessage := strings.TrimSpace(params.UserMessage)
	if userMessage == "" {
		return ExplainChatResult{}, errors.New("user_message is required")
	}

	explicitQuestionRef := hasExplicitQuestionReference(params.UserMessage)
	inferredQuestionIndex := params.QuestionIndex
	if inferredQuestionIndex == nil {
		parsed := s.inferQuestionIndexByLLM(requestID, params.UserMessage, params.PageContext.QuestionSnapshots)
		inferredQuestionIndex = parsed
	}
	if inferredQuestionIndex != nil {
		params.QuestionIndex = inferredQuestionIndex
	} else if explicitQuestionRef {
		// User explicitly referenced a question number, but resolution failed.
		// Avoid incorrectly falling back to current question index.
		params.PageContext.CurrentQuestionIndex = nil
	}

	resolvedQuestion, err := s.resolveChatQuestion(requestID, userID, params)
	if err != nil {
		return ExplainChatResult{}, err
	}

	systemPrompt, err := s.buildExplainChatSystemPrompt(params.PageContext, resolvedQuestion)
	if err != nil {
		return ExplainChatResult{}, err
	}
	finalUserMessage := userMessage
	if resolvedQuestion != nil {
		finalUserMessage = fmt.Sprintf(
			"题目上下文：\n题目：%s\n标准答案：%s\n用户答案：%s\n\n用户问题：%s",
			resolvedQuestion.Question,
			resolvedQuestion.AnswerKey,
			resolvedQuestion.UserAnswer,
			userMessage,
		)
	}

	sessionKey := fmt.Sprintf("%d:%s", userID, sessionID)
	s.pruneExpiredChatSessionsLocked()
	history := s.loadChatWindow(sessionKey)
	assistantMessage, err := s.callLLMContent(
		context.Background(),
		requestID,
		llmTaskChat,
		renderExplainChatPrompt(systemPrompt, history, finalUserMessage),
		nil,
	)
	if err != nil {
		return ExplainChatResult{}, err
	}
	s.saveChatWindow(sessionKey, finalUserMessage, assistantMessage)

	return ExplainChatResult{
		SessionID:        sessionID,
		AssistantMessage: assistantMessage,
		ResolvedQuestion: resolvedQuestion,
	}, nil
}

func (s *QuestionService) callLLM(
	ctx context.Context,
	requestID string,
	level, numbers int,
	studyType, translationMode int,
	customRequirements []string,
	excludeQuestions []string,
	onToken func(string) error,
) ([]GeneratedQuestion, error) {
	prompt, err := s.buildPrompt(level, numbers, studyType, translationMode, customRequirements, excludeQuestions)
	if err != nil {
		return nil, err
	}
	content, err := s.callLLMContent(ctx, requestID, llmTaskGenerate, prompt, onToken)
	if err != nil {
		return nil, err
	}
	var rows [][]string
	if err := unmarshalJSONArray(content, &rows); err != nil {
		logger.L().Warn("llm generate primary parse failed, fallback parsing",
			zap.String("request_id", requestID),
			zap.Error(err),
		)
		fallbackRows, fallbackErr := parseConcatenatedRows(content)
		if fallbackErr != nil {
			return nil, err
		}
		rows = fallbackRows
	}
	generated := make([]GeneratedQuestion, 0, len(rows))
	for _, row := range rows {
		if len(row) < 2 {
			continue
		}
		generated = append(generated, GeneratedQuestion{
			Question:  strings.TrimSpace(row[0]),
			AnswerKey: strings.TrimSpace(row[1]),
		})
	}
	if len(generated) == 0 {
		return nil, fmt.Errorf("empty generated questions")
	}
	return generated, nil
}

func (s *QuestionService) callLLMContent(
	ctx context.Context,
	requestID,
	taskType,
	prompt string,
	onToken func(string) error,
) (string, error) {
	client, modelName, resolveErr := s.resolveLLMClient(taskType)
	if resolveErr != nil {
		return "", resolveErr
	}
	if client == nil {
		return "", errors.New("llm client is not initialized")
	}
	logger.L().Info("llm request",
		zap.String("request_id", requestID),
		zap.String("task_type", taskType),
		zap.String("endpoint", s.endpoint),
		zap.String("model", modelName),
		zap.Int("prompt_len", len(prompt)),
		zap.String("prompt", truncate([]byte(prompt), 7000)),
	)
	var (
		content string
		err     error
	)
	if onToken == nil {
		content, err = client.Generate(ctx, prompt)
	} else {
		chunks := 0
		content, err = client.StreamGenerate(ctx, prompt, func(chunk string) error {
			chunks++
			return onToken(chunk)
		})
		logger.L().Info("llm stream completed",
			zap.String("request_id", requestID),
			zap.Int("chunk_count", chunks),
		)
	}
	if err != nil {
		return "", err
	}
	content = strings.TrimSpace(content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)
	logger.L().Info("llm response parsed",
		zap.String("request_id", requestID),
		zap.String("content_snippet", truncate([]byte(content), 300)),
	)
	return content, nil
}

func (s *QuestionService) callLLMRawContent(
	ctx context.Context,
	requestID,
	taskType,
	prompt string,
	onToken func(string) error,
) (string, error) {
	client, modelName, resolveErr := s.resolveLLMClient(taskType)
	if resolveErr != nil {
		return "", resolveErr
	}
	if client == nil {
		return "", errors.New("llm client is not initialized")
	}
	logger.L().Info("llm raw request",
		zap.String("request_id", requestID),
		zap.String("task_type", taskType),
		zap.String("endpoint", s.endpoint),
		zap.String("model", modelName),
		zap.Int("prompt_len", len(prompt)),
		zap.String("prompt", truncate([]byte(prompt), 7000)),
	)
	var (
		content string
		err     error
	)
	if onToken == nil {
		content, err = client.Generate(ctx, prompt)
	} else {
		content, err = client.StreamGenerate(ctx, prompt, onToken)
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(content), nil
}

func (s *QuestionService) retryParseAnalyzeOutput(
	ctx context.Context,
	requestID string,
	originalPrompt string,
	rawOutput string,
) ([]string, error) {
	currentOutput := rawOutput
	for attempt := 1; attempt <= maxAnalyzeParseRetries; attempt++ {
		repairPrompt := s.mustBuildAnalyzeRepairPrompt(originalPrompt, currentOutput)
		repaired, repairErr := s.callLLMRawContent(ctx, requestID, llmTaskAnalyze, repairPrompt, nil)
		if repairErr != nil {
			return nil, repairErr
		}
		logger.L().Info("llm analyze repair raw output",
			zap.String("request_id", requestID),
			zap.Int("retry_attempt", attempt),
			zap.String("content", repaired),
		)
		parsed, parseErr := parseAnalyzeOutputSafely(repaired)
		if parseErr == nil {
			return parsed, nil
		}
		currentOutput = repaired
		logger.L().Warn("llm analyze retry parse failed",
			zap.String("request_id", requestID),
			zap.Int("retry_attempt", attempt),
			zap.Error(parseErr),
		)
	}
	return nil, fmt.Errorf("invalid structured output after %d retries", maxAnalyzeParseRetries)
}

func (s *QuestionService) mustBuildAnalyzeRepairPrompt(_ string, rawOutput string) string {
	content, err := os.ReadFile(s.analyzeRepairPromptFile)
	if err != nil {
		logger.L().Warn("read analyze repair prompt file failed, fallback to inline prompt", zap.String("request_id", "-"), zap.Error(err))
		return fmt.Sprintf(
			"你是 JSON 格式修复器。你的唯一任务是把“待修复输出”修复成合法的 JSON 字符串数组。\n\n"+
				"严格要求：\n"+
				"1) 最终结果必须是合法的 JSON 字符串数组，例如 [] 或 [\"...\"].\n"+
				"2) 只做格式修复，不做内容判断，不重新理解题意，不重新判题。\n"+
				"3) 不得新增、删除、改写原有结论；只允许做最小必要修改，例如去掉 markdown、提取数组、补双引号、修复转义、删除数组外解释文字。\n"+
				"4) 如果待修复输出中明显包含 1 条或多条错误描述，不得把它改成 []。\n"+
				"5) 只有当待修复输出明确表示“无错误”且没有任何错误描述时，才允许输出 []。\n"+
				"6) 禁止输出对象，禁止输出解释，禁止输出 markdown，禁止输出代码块。\n"+
				"7) 只输出修复后的 JSON 字符串数组本身。\n\n"+
				"待修复输出：\n%s",
			rawOutput,
		)
	}
	prompt := string(content)
	prompt = strings.ReplaceAll(prompt, "{{raw_output}}", rawOutput)
	return prompt
}

func parseAnalyzeOutputSafely(text string) ([]string, error) {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return []string{}, nil
	}
	parseCandidates := buildAnalyzeParseCandidates(trimmed)
	var lastErr error
	for _, candidate := range parseCandidates {
		rawJSON := extractLikelyJSON(candidate)
		if rawJSON == "" {
			continue
		}
		var arrayParsed []string
		if err := json.Unmarshal([]byte(rawJSON), &arrayParsed); err == nil {
			return arrayParsed, nil
		} else {
			lastErr = err
		}
		var objectParsed struct {
			Issues []string `json:"issues"`
		}
		if err := json.Unmarshal([]byte(rawJSON), &objectParsed); err == nil {
			if objectParsed.Issues == nil {
				objectParsed.Issues = []string{}
			}
			return objectParsed.Issues, nil
		} else {
			lastErr = err
		}
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, errors.New("unable to parse analyze output")
}

func buildAnalyzeParseCandidates(text string) []string {
	candidates := make([]string, 0, 4)
	candidates = append(candidates, text)

	rawJSON := extractLikelyJSON(text)
	if rawJSON != "" {
		candidates = append(candidates, rawJSON)
		candidates = append(candidates, fmt.Sprintf("```json\n%s\n```", rawJSON))
	}
	if strings.HasPrefix(text, "```") && !strings.HasPrefix(text, "```json") {
		fixed := strings.Replace(text, "```", "```json", 1)
		candidates = append(candidates, fixed)
	}
	return uniqueStringList(candidates)
}

func extractLikelyJSON(text string) string {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return ""
	}
	if fragment := extractBalancedJSONFragment(trimmed, '[', ']'); fragment != "" {
		return fragment
	}
	if fragment := extractBalancedJSONFragment(trimmed, '{', '}'); fragment != "" {
		return fragment
	}
	return ""
}

func extractBalancedJSONFragment(text string, openCh, closeCh byte) string {
	for start := 0; start < len(text); start++ {
		if text[start] != openCh {
			continue
		}
		depth := 0
		inString := false
		escaped := false
		for end := start; end < len(text); end++ {
			ch := text[end]
			if inString {
				if escaped {
					escaped = false
					continue
				}
				if ch == '\\' {
					escaped = true
					continue
				}
				if ch == '"' {
					inString = false
				}
				continue
			}
			if ch == '"' {
				inString = true
				continue
			}
			if ch == openCh {
				depth++
				continue
			}
			if ch == closeCh {
				depth--
				if depth == 0 {
					return strings.TrimSpace(text[start : end+1])
				}
			}
		}
	}
	return ""
}

func uniqueStringList(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	unique := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		unique = append(unique, trimmed)
	}
	return unique
}

func (s *QuestionService) runGenerateRounds(
	ctx context.Context,
	requestID string,
	level, targetNumbers int,
	studyType, translationMode int,
	customRequirements []string,
	excludeSet map[string]struct{},
	excludeForPrompt []string,
	onToken func(string) error,
	onMeta func(StreamMeta) error,
) ([]GeneratedQuestion, error) {
	generated := make([]GeneratedQuestion, 0, targetNumbers)
	for round := 0; round < maxGenerateRounds && len(generated) < targetNumbers; round++ {
		missing := targetNumbers - len(generated)
		batch, callErr := s.callLLM(
			ctx,
			requestID,
			level,
			missing,
			studyType,
			translationMode,
			customRequirements,
			excludeForPrompt,
			onToken,
		)
		if callErr != nil {
			logger.L().Error("llm generate failed",
				zap.String("request_id", requestID),
				zap.Int("retry_round", round),
				zap.Error(callErr),
			)
			return nil, callErr
		}
		filtered := filterUniqueGenerated(batch, excludeSet)
		for _, item := range filtered {
			if len(generated) >= targetNumbers {
				break
			}
			generated = append(generated, item)
			excludeForPrompt = append(excludeForPrompt, item.Question)
			excludeSet[normalizeQuestion(item.Question)] = struct{}{}
		}
		excludeForPrompt = uniqueQuestions(excludeForPrompt, maxExcludeInPrompt)
		meta := StreamMeta{
			RetryRound: round,
			RawCount:   len(batch),
			Filtered:   len(filtered),
			FinalCount: len(generated),
		}
		logger.L().Info("llm generate round",
			zap.String("request_id", requestID),
			zap.Int("retry_round", meta.RetryRound),
			zap.Int("raw_generated_count", meta.RawCount),
			zap.Int("filtered_count", meta.Filtered),
			zap.Int("final_count", meta.FinalCount),
		)
		if onMeta != nil {
			if err := onMeta(meta); err != nil {
				return nil, err
			}
		}
	}
	if len(generated) == 0 {
		logger.L().Error("llm generate empty result", zap.String("request_id", requestID))
		return nil, errors.New("llm returned empty questions")
	}
	return generated, nil
}

func (s *QuestionService) generateWithPreheat(
	ctx context.Context,
	requestID string,
	userID uint,
	mode *model.Mode,
	onToken func(string) error,
	onMeta func(StreamMeta) error,
) ([]GeneratedQuestion, error) {
	historyQuestions, err := s.repo.ListQuestionTextsByMode(requestID, userID, mode.ID)
	if err != nil {
		logger.L().Error("llm generate failed list question history", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}

	readyFromPool, err := s.repo.AcquireReadyPreGeneratedQuestions(requestID, userID, mode.ID, mode.Numbers)
	if err != nil {
		logger.L().Error("pre-generated acquire failed", zap.String("request_id", requestID), zap.Error(err))
		return nil, err
	}

	generated := make([]GeneratedQuestion, 0, mode.Numbers)
	excludeSet := make(map[string]struct{}, len(historyQuestions)+len(readyFromPool)+mode.Numbers)
	excludeForPromptSource := make([]string, 0, len(historyQuestions)+len(readyFromPool))
	for _, question := range historyQuestions {
		normalized := normalizeQuestion(question)
		if normalized == "" {
			continue
		}
		excludeSet[normalized] = struct{}{}
		excludeForPromptSource = append(excludeForPromptSource, question)
	}
	for _, item := range readyFromPool {
		normalized := normalizeQuestion(item.Question)
		if normalized != "" {
			excludeSet[normalized] = struct{}{}
			excludeForPromptSource = append(excludeForPromptSource, item.Question)
		}
		preID := item.ID
		generated = append(generated, GeneratedQuestion{
			Question:       strings.TrimSpace(item.Question),
			AnswerKey:      strings.TrimSpace(item.AnswerKey),
			PreGeneratedID: &preID,
		})
	}

	poolHitCount := len(readyFromPool)
	missing := mode.Numbers - len(generated)
	llmFallbackCount := 0
	if missing > 0 {
		excludeForPrompt := uniqueQuestions(excludeForPromptSource, maxExcludeInPrompt)
		batch, callErr := s.runGenerateRounds(
			ctx,
			requestID,
			mode.Level,
			missing,
			mode.Type,
			mode.Mode,
			[]string(mode.Requirements),
			excludeSet,
			excludeForPrompt,
			onToken,
			onMeta,
		)
		if callErr != nil {
			return nil, callErr
		}
		llmFallbackCount = len(batch)
		generated = append(generated, batch...)
	}

	logger.L().Info("llm generate with preheat",
		zap.String("request_id", requestID),
		zap.Uint("user_id", userID),
		zap.Uint("mode_id", mode.ID),
		zap.Int("pool_hit_count", poolHitCount),
		zap.Int("pool_miss_count", maxInt(mode.Numbers-poolHitCount, 0)),
		zap.Int("llm_fallback_count", llmFallbackCount),
	)
	return generated, nil
}

func (s *QuestionService) startPreheatTicker() {
	if !s.preheatEnabled {
		logger.L().Info("preheat ticker disabled", zap.String("request_id", "-"))
		return
	}
	go func() {
		ticker := time.NewTicker(s.preheatInterval)
		defer ticker.Stop()
		s.runPreheatRound("preheat-initial")
		for range ticker.C {
			s.runPreheatRound("preheat-ticker")
		}
	}()
}

func (s *QuestionService) runPreheatRound(requestID string) {
	if s.generateLLM == nil || s.endpoint == "" || s.generateModel == "" {
		return
	}
	_, _ = s.repo.RecycleServedPreGeneratedQuestions(requestID, time.Now().Add(-s.preheatTimeout))
	modes, err := s.repo.ListAllModes(requestID)
	if err != nil || len(modes) == 0 {
		return
	}
	totalGenerated := 0
	for _, mode := range modes {
		targetCount := s.targetPreheatCountByStudyType(mode.Type)
		if targetCount <= 0 {
			continue
		}
		readyCount, countErr := s.repo.CountPreGeneratedByStatus(requestID, mode.UserID, mode.ID, preGeneratedStatusReady)
		if countErr != nil || int(readyCount) >= targetCount {
			continue
		}
		missing := targetCount - int(readyCount)
		historyQuestions, historyErr := s.repo.ListQuestionTextsByMode(requestID, mode.UserID, mode.ID)
		if historyErr != nil {
			continue
		}
		poolQuestions, poolErr := s.repo.ListPreGeneratedQuestionTextsByMode(requestID, mode.UserID, mode.ID)
		if poolErr != nil {
			continue
		}
		excludeSet := make(map[string]struct{}, len(historyQuestions)+len(poolQuestions)+missing)
		excludeForPromptSource := make([]string, 0, len(historyQuestions)+len(poolQuestions))
		for _, question := range append(historyQuestions, poolQuestions...) {
			normalized := normalizeQuestion(question)
			if normalized == "" {
				continue
			}
			excludeSet[normalized] = struct{}{}
			excludeForPromptSource = append(excludeForPromptSource, question)
		}

		generated, genErr := s.runGenerateRounds(
			context.Background(),
			requestID,
			mode.Level,
			missing,
			mode.Type,
			mode.Mode,
			[]string(mode.Requirements),
			excludeSet,
			uniqueQuestions(excludeForPromptSource, maxExcludeInPrompt),
			nil,
			nil,
		)
		if genErr != nil || len(generated) == 0 {
			continue
		}
		items := make([]model.PreGeneratedQuestion, 0, len(generated))
		for _, item := range generated {
			items = append(items, model.PreGeneratedQuestion{
				UserID:    mode.UserID,
				ModeID:    mode.ID,
				Question:  item.Question,
				AnswerKey: item.AnswerKey,
				Status:    preGeneratedStatusReady,
			})
		}
		if err := s.repo.BulkCreatePreGeneratedQuestions(requestID, items); err == nil {
			totalGenerated += len(items)
		}
	}
	logger.L().Info("preheat round completed",
		zap.String("request_id", requestID),
		zap.Int("warmup_generated_count", totalGenerated),
	)
}

func (s *QuestionService) targetPreheatCountByStudyType(studyType int) int {
	if studyType == studyTypeArticle {
		return s.preheatTargetArt
	}
	return s.preheatTargetWS
}

func (s *QuestionService) buildPrompt(
	level, numbers, studyType, translationMode int,
	customRequirements []string,
	excludeQuestions []string,
) (string, error) {
	content, err := os.ReadFile(s.promptFile)
	if err != nil {
		return "", fmt.Errorf("read prompt file failed: %w", err)
	}
	sourceLanguage, targetLanguage := translationLanguagePair(translationMode)
	prompt := string(content)
	prompt = strings.ReplaceAll(prompt, "{{level}}", fmt.Sprintf("%d", level))
	prompt = strings.ReplaceAll(prompt, "{{numbers}}", fmt.Sprintf("%d", numbers))
	prompt = strings.ReplaceAll(prompt, "{{study_type}}", studyTypeLabel(studyType))
	prompt = strings.ReplaceAll(prompt, "{{translation_mode}}", translationModeLabel(translationMode))
	prompt = strings.ReplaceAll(prompt, "{{source_language}}", sourceLanguage)
	prompt = strings.ReplaceAll(prompt, "{{target_language}}", targetLanguage)
	prompt = strings.ReplaceAll(prompt, "{{custom_requirements}}", formatCustomRequirements(customRequirements))
	prompt = strings.ReplaceAll(prompt, "{{exclude_questions}}", formatExcludeQuestions(excludeQuestions))
	return prompt, nil
}

func (s *QuestionService) buildAnalyzePrompt(
	question, answerText, answerKey string,
	studyType, translationMode int,
) (string, error) {
	content, err := os.ReadFile(s.analyzePromptFile)
	if err != nil {
		return "", fmt.Errorf("read analyze prompt file failed: %w", err)
	}
	sourceLanguage, targetLanguage := translationLanguagePair(translationMode)
	prompt := string(content)
	prompt = strings.ReplaceAll(prompt, "{{study_type}}", studyTypeLabel(studyType))
	prompt = strings.ReplaceAll(prompt, "{{translation_mode}}", translationModeLabel(translationMode))
	prompt = strings.ReplaceAll(prompt, "{{source_language}}", sourceLanguage)
	prompt = strings.ReplaceAll(prompt, "{{target_language}}", targetLanguage)
	prompt = strings.ReplaceAll(prompt, "{{question}}", question)
	prompt = strings.ReplaceAll(prompt, "{{answer_text}}", answerText)
	prompt = strings.ReplaceAll(prompt, "{{answer_key}}", answerKey)
	return prompt, nil
}

func studyTypeLabel(studyType int) string {
	switch studyType {
	case studyTypeWord:
		return "单词"
	case studyTypeArticle:
		return "文章"
	default:
		return "句子"
	}
}

func translationModeLabel(translationMode int) string {
	if translationMode == translationModeEnToZh {
		return "英译中"
	}
	return "中译英"
}

func translationLanguagePair(translationMode int) (string, string) {
	if translationMode == translationModeEnToZh {
		return "英文", "中文"
	}
	return "中文", "英文"
}

func (s *QuestionService) resolveChatQuestion(
	requestID string,
	userID uint,
	params ExplainChatParams,
) (*ExplainChatQuestionSnapshot, error) {
	var resolved *ExplainChatQuestionSnapshot
	if params.QuestionIndex != nil {
		for _, item := range params.PageContext.QuestionSnapshots {
			if item.Index != nil && *item.Index == *params.QuestionIndex {
				copied := item
				resolved = &copied
				break
			}
		}
	}
	if resolved == nil && params.PageContext.CurrentQuestionIndex != nil {
		for _, item := range params.PageContext.QuestionSnapshots {
			if item.Index != nil && *item.Index == *params.PageContext.CurrentQuestionIndex {
				copied := item
				resolved = &copied
				break
			}
		}
	}
	if resolved != nil && resolved.QuestionID != nil {
		dbItem, err := s.repo.GetQuestionByID(requestID, *resolved.QuestionID, userID)
		if err == nil {
			resolved.Question = dbItem.Question
			resolved.AnswerKey = dbItem.AnswerKey
			resolved.UserAnswer = dbItem.AnswerText
		}
	}
	return resolved, nil
}

func (s *QuestionService) inferQuestionIndexByLLM(
	requestID string,
	userMessage string,
	snapshots []ExplainChatQuestionSnapshot,
) *int {
	if len(snapshots) == 0 {
		return nil
	}
	indexList := make([]string, 0, len(snapshots))
	for _, item := range snapshots {
		if item.Index != nil {
			indexList = append(indexList, fmt.Sprintf("%d", *item.Index))
		}
	}
	if len(indexList) == 0 {
		return nil
	}
	direct := inferQuestionIndexByText(userMessage, snapshots)
	if direct != nil {
		return direct
	}
	prompt := fmt.Sprintf(
		"你是信息抽取器。任务：从用户文本中抽取其想问的题号。\n"+
			"可选题号集合：[%s]\n"+
			"用户文本：%s\n\n"+
			"规则：\n"+
			"1) 如果能明确识别到且在集合内，只输出阿拉伯数字（例如 3）。\n"+
			"2) 不能确定或不在集合内，输出 0。\n"+
			"3) 只允许输出数字，不要任何其他内容。",
		strings.Join(indexList, ", "),
		userMessage,
	)
	content, err := s.callLLMContent(context.Background(), requestID, llmTaskChat, prompt, nil)
	if err != nil {
		logger.L().Warn("infer question index by llm failed", zap.String("request_id", requestID), zap.Error(err))
		return inferQuestionIndexByRegex(userMessage, snapshots)
	}
	value := strings.TrimSpace(content)
	parsed, parseErr := strconv.Atoi(value)
	if parseErr != nil {
		parsedFromRegex := regexp.MustCompile(`\d+`).FindString(value)
		if parsedFromRegex == "" {
			return inferQuestionIndexByRegex(userMessage, snapshots)
		}
		parsed, parseErr = strconv.Atoi(parsedFromRegex)
		if parseErr != nil {
			return inferQuestionIndexByRegex(userMessage, snapshots)
		}
	}
	if parsed <= 0 {
		return nil
	}
	for _, item := range snapshots {
		if item.Index != nil && *item.Index == parsed {
			result := parsed
			return &result
		}
	}
	return nil
}

func inferQuestionIndexByRegex(userMessage string, snapshots []ExplainChatQuestionSnapshot) *int {
	available := make(map[int]struct{}, len(snapshots))
	for _, item := range snapshots {
		if item.Index != nil {
			available[*item.Index] = struct{}{}
		}
	}
	if len(available) == 0 {
		return nil
	}
	matches := regexp.MustCompile(`\d+`).FindAllString(userMessage, -1)
	for _, match := range matches {
		value, err := strconv.Atoi(match)
		if err != nil || value <= 0 {
			continue
		}
		if _, ok := available[value]; ok {
			result := value
			return &result
		}
	}
	return nil
}

func hasExplicitQuestionReference(userMessage string) bool {
	text := strings.TrimSpace(userMessage)
	if text == "" {
		return false
	}
	patterns := []*regexp.Regexp{
		regexp.MustCompile(`第[一二三四五六七八九十百零两〇\d]+[题道]`),
		regexp.MustCompile(`\d+\s*[题道]`),
	}
	for _, pattern := range patterns {
		if pattern.MatchString(text) {
			return true
		}
	}
	return false
}

func inferQuestionIndexByText(userMessage string, snapshots []ExplainChatQuestionSnapshot) *int {
	available := make(map[int]struct{}, len(snapshots))
	for _, item := range snapshots {
		if item.Index != nil {
			available[*item.Index] = struct{}{}
		}
	}
	if len(available) == 0 {
		return nil
	}

	// Highest-priority pattern: "第X题/第X道".
	ordinalMatches := regexp.MustCompile(`第([一二三四五六七八九十百零两〇\d]+)[题道]`).FindAllStringSubmatch(userMessage, -1)
	for _, match := range ordinalMatches {
		if len(match) < 2 {
			continue
		}
		value, ok := parseQuestionIndexToken(match[1])
		if !ok {
			continue
		}
		if _, exists := available[value]; exists {
			result := value
			return &result
		}
	}

	// Fallback: plain arabic number if unique and in available set.
	return inferQuestionIndexByRegex(userMessage, snapshots)
}

func parseQuestionIndexToken(token string) (int, bool) {
	trimmed := strings.TrimSpace(token)
	if trimmed == "" {
		return 0, false
	}
	if value, err := strconv.Atoi(trimmed); err == nil && value > 0 {
		return value, true
	}

	digitMap := map[rune]int{
		'零': 0, '〇': 0,
		'一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
		'六': 6, '七': 7, '八': 8, '九': 9,
	}
	unitMap := map[rune]int{
		'十': 10,
		'百': 100,
	}
	total := 0
	current := 0
	for _, char := range trimmed {
		if digit, ok := digitMap[char]; ok {
			current = digit
			continue
		}
		if unit, ok := unitMap[char]; ok {
			if current == 0 {
				current = 1
			}
			total += current * unit
			current = 0
			continue
		}
		return 0, false
	}
	total += current
	if total <= 0 {
		return 0, false
	}
	return total, true
}

func (s *QuestionService) buildExplainChatSystemPrompt(
	pageContext ExplainChatPageContext,
	resolvedQuestion *ExplainChatQuestionSnapshot,
) (string, error) {
	content, err := os.ReadFile(s.chatPromptFile)
	if err != nil {
		return "", fmt.Errorf("read chat prompt file failed: %w", err)
	}
	studyType := ""
	if pageContext.StudyType != nil {
		studyType = studyTypeLabel(*pageContext.StudyType)
	}
	translationMode := ""
	sourceLanguage := ""
	targetLanguage := ""
	if pageContext.TranslationMode != nil {
		translationMode = translationModeLabel(*pageContext.TranslationMode)
		sourceLanguage, targetLanguage = translationLanguagePair(*pageContext.TranslationMode)
	}
	questionText := ""
	answerKey := ""
	userAnswer := ""
	if resolvedQuestion != nil {
		questionText = resolvedQuestion.Question
		answerKey = resolvedQuestion.AnswerKey
		userAnswer = resolvedQuestion.UserAnswer
	}
	prompt := string(content)
	prompt = strings.ReplaceAll(prompt, "{{page}}", pageContext.Page)
	prompt = strings.ReplaceAll(prompt, "{{study_type}}", studyType)
	prompt = strings.ReplaceAll(prompt, "{{translation_mode}}", translationMode)
	prompt = strings.ReplaceAll(prompt, "{{source_language}}", sourceLanguage)
	prompt = strings.ReplaceAll(prompt, "{{target_language}}", targetLanguage)
	prompt = strings.ReplaceAll(prompt, "{{question}}", questionText)
	prompt = strings.ReplaceAll(prompt, "{{answer_key}}", answerKey)
	prompt = strings.ReplaceAll(prompt, "{{user_answer}}", userAnswer)
	return prompt, nil
}

func renderExplainChatPrompt(systemPrompt string, history []chatMessageRecord, userMessage string) string {
	var builder strings.Builder
	builder.WriteString(systemPrompt)
	builder.WriteString("\n\n历史对话（最近窗口）：\n")
	if len(history) == 0 {
		builder.WriteString("无\n")
	} else {
		for _, item := range history {
			builder.WriteString(item.Role)
			builder.WriteString(": ")
			builder.WriteString(item.Content)
			builder.WriteString("\n")
		}
	}
	builder.WriteString("\n用户: ")
	builder.WriteString(userMessage)
	return builder.String()
}

func (s *QuestionService) loadChatWindow(sessionKey string) []chatMessageRecord {
	s.chatSessionMu.Lock()
	defer s.chatSessionMu.Unlock()
	history := s.chatSessions[sessionKey]
	cloned := make([]chatMessageRecord, len(history))
	copy(cloned, history)
	s.chatSessionAccess[sessionKey] = time.Now()
	return cloned
}

func (s *QuestionService) saveChatWindow(sessionKey, userMessage, assistantMessage string) {
	s.chatSessionMu.Lock()
	defer s.chatSessionMu.Unlock()
	history := s.chatSessions[sessionKey]
	history = append(history,
		chatMessageRecord{Role: "用户", Content: userMessage},
		chatMessageRecord{Role: "助手", Content: assistantMessage},
	)
	if len(history) > chatWindowSize*2 {
		history = history[len(history)-chatWindowSize*2:]
	}
	s.chatSessions[sessionKey] = history
	s.chatSessionAccess[sessionKey] = time.Now()
}

func (s *QuestionService) pruneExpiredChatSessionsLocked() {
	s.chatSessionMu.Lock()
	defer s.chatSessionMu.Unlock()
	now := time.Now()
	for key, accessAt := range s.chatSessionAccess {
		if now.Sub(accessAt) > chatSessionTTL {
			delete(s.chatSessionAccess, key)
			delete(s.chatSessions, key)
		}
	}
}

func unmarshalJSONArray[T any](content string, out *T) error {
	if err := json.Unmarshal([]byte(content), out); err == nil {
		return nil
	}
	candidate, err := findFirstValidJSONArray(content)
	if err != nil {
		return fmt.Errorf("invalid json array response: %s", content)
	}
	if err := json.Unmarshal([]byte(candidate), out); err != nil {
		return err
	}
	return nil
}

func findFirstValidJSONArray(content string) (string, error) {
	for i := 0; i < len(content); i++ {
		if content[i] != '[' {
			continue
		}
		inString := false
		escaped := false
		depth := 0
		for j := i; j < len(content); j++ {
			ch := content[j]
			if escaped {
				escaped = false
				continue
			}
			if ch == '\\' && inString {
				escaped = true
				continue
			}
			if ch == '"' {
				inString = !inString
				continue
			}
			if inString {
				continue
			}
			if ch == '[' {
				depth++
			}
			if ch == ']' {
				depth--
				if depth == 0 {
					candidate := strings.TrimSpace(content[i : j+1])
					var raw json.RawMessage
					if err := json.Unmarshal([]byte(candidate), &raw); err == nil {
						return candidate, nil
					}
					break
				}
			}
		}
	}
	return "", fmt.Errorf("no valid json array found")
}

func parseConcatenatedRows(content string) ([][]string, error) {
	candidates := make([]string, 0)
	for i := 0; i < len(content); i++ {
		if content[i] != '[' {
			continue
		}
		inString := false
		escaped := false
		depth := 0
		for j := i; j < len(content); j++ {
			ch := content[j]
			if escaped {
				escaped = false
				continue
			}
			if ch == '\\' && inString {
				escaped = true
				continue
			}
			if ch == '"' {
				inString = !inString
				continue
			}
			if inString {
				continue
			}
			if ch == '[' {
				depth++
			}
			if ch == ']' {
				depth--
				if depth == 0 {
					candidate := strings.TrimSpace(content[i : j+1])
					var row []string
					if err := json.Unmarshal([]byte(candidate), &row); err == nil && len(row) >= 2 {
						candidates = append(candidates, candidate)
					}
					i = j
					break
				}
			}
		}
	}
	if len(candidates) == 0 {
		return nil, fmt.Errorf("no concatenated rows found")
	}
	rows := make([][]string, 0, len(candidates))
	for _, candidate := range candidates {
		var row []string
		if err := json.Unmarshal([]byte(candidate), &row); err != nil || len(row) < 2 {
			continue
		}
		rows = append(rows, row)
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("no valid rows parsed")
	}
	return rows, nil
}

func truncate(input []byte, limit int) string {
	text := string(input)
	if len(text) <= limit {
		return text
	}
	return text[:limit] + "...(truncated)"
}

func normalizeQuestion(question string) string {
	trimmed := strings.TrimSpace(question)
	if trimmed == "" {
		return ""
	}
	return strings.Join(strings.Fields(trimmed), " ")
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func withDefaultInt(value, fallback int) int {
	if value > 0 {
		return value
	}
	return fallback
}

func withDefaultDuration(value, fallback time.Duration) time.Duration {
	if value > 0 {
		return value
	}
	return fallback
}

func filterUniqueGenerated(batch []GeneratedQuestion, excludeSet map[string]struct{}) []GeneratedQuestion {
	filtered := make([]GeneratedQuestion, 0, len(batch))
	for _, item := range batch {
		normalized := normalizeQuestion(item.Question)
		if normalized == "" {
			continue
		}
		if _, exists := excludeSet[normalized]; exists {
			continue
		}
		filtered = append(filtered, item)
		excludeSet[normalized] = struct{}{}
	}
	return filtered
}

func uniqueQuestions(questions []string, limit int) []string {
	if len(questions) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(questions))
	unique := make([]string, 0, len(questions))
	for _, question := range questions {
		trimmed := strings.TrimSpace(question)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		unique = append(unique, trimmed)
		if limit > 0 && len(unique) >= limit {
			break
		}
	}
	return unique
}

func formatExcludeQuestions(questions []string) string {
	unique := uniqueQuestions(questions, maxExcludeInPrompt)
	if len(unique) == 0 {
		return "无"
	}
	lines := make([]string, 0, len(unique))
	for index, question := range unique {
		lines = append(lines, fmt.Sprintf("%d. %s", index+1, question))
	}
	return strings.Join(lines, "\n")
}

func formatCustomRequirements(requirements []string) string {
	unique := uniqueQuestions(requirements, maxCustomReqsInPrompt)
	if len(unique) == 0 {
		return "无额外要求。"
	}
	lines := make([]string, 0, len(unique))
	for index, requirement := range unique {
		lines = append(lines, fmt.Sprintf("%d. %s", index+1, requirement))
	}
	return strings.Join(lines, "\n")
}
