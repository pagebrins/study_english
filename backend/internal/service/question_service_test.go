package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"study_english/backend/internal/model"
	"study_english/backend/internal/pkg/db"
	"study_english/backend/internal/repository"
)

type llmMockServer struct {
	mu        sync.Mutex
	index     int
	responses []string
	prompts   []string
}

func (m *llmMockServer) handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Messages []struct {
				Content string `json:"content"`
			} `json:"messages"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		prompt := ""
		if len(req.Messages) > 0 {
			prompt = req.Messages[0].Content
		}

		m.mu.Lock()
		m.prompts = append(m.prompts, prompt)
		responseIndex := m.index
		if responseIndex >= len(m.responses) {
			responseIndex = len(m.responses) - 1
		}
		content := m.responses[responseIndex]
		m.index++
		m.mu.Unlock()

		body := map[string]any{
			"choices": []map[string]any{
				{
					"message": map[string]any{"content": content},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(body)
	}
}

func setupQuestionServiceForTest(t *testing.T, responses []string, level, numbers int) (*QuestionService, *repository.Repository, uint, uint, *llmMockServer, func()) {
	t.Helper()
	database, err := db.New("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("init db failed: %v", err)
	}
	repo := repository.New(database)

	user := &model.User{Email: "dedupe@test.com", Name: "Dedupe", PasswordHash: "x"}
	if err := repo.CreateUser("-", user); err != nil {
		t.Fatalf("create user failed: %v", err)
	}
	mode := &model.Mode{
		UserID:      user.ID,
		Name:        "mode",
		Description: "desc",
		Level:       level,
		Numbers:     numbers,
		Type:        2,
		Mode:        1,
	}
	if err := repo.CreateMode("-", mode); err != nil {
		t.Fatalf("create mode failed: %v", err)
	}

	mock := &llmMockServer{responses: responses}
	server := httptest.NewServer(mock.handler())

	promptFile, err := os.CreateTemp("", "generate-prompt-*.md")
	if err != nil {
		t.Fatalf("create prompt temp file failed: %v", err)
	}
	promptContent := "level={{level}}\nnumbers={{numbers}}\nrequirements:\n{{custom_requirements}}\nexclude:\n{{exclude_questions}}"
	if err := os.WriteFile(promptFile.Name(), []byte(promptContent), 0o644); err != nil {
		t.Fatalf("write prompt temp file failed: %v", err)
	}
	analyzeFile, err := os.CreateTemp("", "analyze-prompt-*.md")
	if err != nil {
		t.Fatalf("create analyze temp file failed: %v", err)
	}
	repairFile, err := os.CreateTemp("", "analyze-repair-prompt-*.md")
	if err != nil {
		t.Fatalf("create analyze repair temp file failed: %v", err)
	}
	repairContent := "原始任务提示：\n{{original_prompt}}\n\n待修复输出：\n{{raw_output}}"
	if err := os.WriteFile(repairFile.Name(), []byte(repairContent), 0o644); err != nil {
		t.Fatalf("write analyze repair temp file failed: %v", err)
	}

	service := NewQuestionService(
		repo,
		"",
		server.URL,
		"qwen2.5",
		"qwen2.5",
		"qwen2.5",
		promptFile.Name(),
		analyzeFile.Name(),
		repairFile.Name(),
		promptFile.Name(),
		true,
		true,
		10,
		30,
		100,
		3,
	)
	cleanup := func() {
		server.Close()
		_ = os.Remove(promptFile.Name())
		_ = os.Remove(analyzeFile.Name())
		_ = os.Remove(repairFile.Name())
	}
	return service, repo, user.ID, mode.ID, mock, cleanup
}

func TestGenerate_DedupesHistoryAndBatch(t *testing.T) {
	service, repo, userID, modeID, mock, cleanup := setupQuestionServiceForTest(
		t,
		[]string{`[["历史题","History"],["历史题","History2"],["新题A","A"],["新题B","B"]]`},
		4,
		2,
	)
	defer cleanup()

	if err := repo.CreateQuestion("-", &model.UserQuestion{
		UserID:    userID,
		ModeID:    modeID,
		Question:  "历史题",
		AnswerKey: "History",
	}); err != nil {
		t.Fatalf("create history question failed: %v", err)
	}

	items, err := service.Generate("-", userID, modeID)
	if err != nil {
		t.Fatalf("generate failed: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 generated questions, got %d", len(items))
	}
	if items[0].Question != "新题A" || items[1].Question != "新题B" {
		t.Fatalf("unexpected generated questions: %+v", items)
	}
	if len(mock.prompts) == 0 || !strings.Contains(mock.prompts[0], "历史题") {
		t.Fatalf("prompt should include excluded history questions, got: %v", mock.prompts)
	}
}

func TestGenerate_RetriesWhenFilteredCountInsufficient(t *testing.T) {
	service, repo, userID, modeID, _, cleanup := setupQuestionServiceForTest(
		t,
		[]string{
			`[["历史题","History"],["新题A","A"]]`,
			`[["新题B","B"]]`,
		},
		5,
		2,
	)
	defer cleanup()

	if err := repo.CreateQuestion("-", &model.UserQuestion{
		UserID:    userID,
		ModeID:    modeID,
		Question:  "历史题",
		AnswerKey: "History",
	}); err != nil {
		t.Fatalf("create history question failed: %v", err)
	}

	items, err := service.Generate("-", userID, modeID)
	if err != nil {
		t.Fatalf("generate failed: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 questions after retry, got %d", len(items))
	}
	if items[0].Question != "新题A" || items[1].Question != "新题B" {
		t.Fatalf("unexpected generated questions: %+v", items)
	}
}

func TestGenerate_ReturnsPartialWhenExhaustedRetries(t *testing.T) {
	service, repo, userID, modeID, _, cleanup := setupQuestionServiceForTest(
		t,
		[]string{
			`[["历史题","History"]]`,
			`[["历史题","History"]]`,
			`[["新题A","A"]]`,
		},
		5,
		2,
	)
	defer cleanup()

	if err := repo.CreateQuestion("-", &model.UserQuestion{
		UserID:    userID,
		ModeID:    modeID,
		Question:  "历史题",
		AnswerKey: "History",
	}); err != nil {
		t.Fatalf("create history question failed: %v", err)
	}

	items, err := service.Generate("-", userID, modeID)
	if err != nil {
		t.Fatalf("generate should return partial result, got err: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected partial 1 question, got %d", len(items))
	}
	if items[0].Question != "新题A" {
		t.Fatalf("unexpected generated question: %+v", items)
	}
}

func TestBuildPrompt_IncludesCustomRequirements(t *testing.T) {
	service, _, _, _, _, cleanup := setupQuestionServiceForTest(t, []string{`[["q","a"]]`}, 5, 1)
	defer cleanup()

	prompt, err := service.buildPrompt(5, 2, 2, 1, []string{"长度大于20个汉字", "围绕国家政治主题"}, []string{"历史题A"})
	if err != nil {
		t.Fatalf("buildPrompt failed: %v", err)
	}
	if !strings.Contains(prompt, "长度大于20个汉字") || !strings.Contains(prompt, "围绕国家政治主题") {
		t.Fatalf("prompt should include custom requirements, got: %s", prompt)
	}
}

func TestBuildPrompt_UsesDefaultWhenNoRequirements(t *testing.T) {
	service, _, _, _, _, cleanup := setupQuestionServiceForTest(t, []string{`[["q","a"]]`}, 5, 1)
	defer cleanup()

	prompt, err := service.buildPrompt(5, 2, 2, 1, nil, []string{"历史题A"})
	if err != nil {
		t.Fatalf("buildPrompt failed: %v", err)
	}
	if !strings.Contains(prompt, "无额外要求") {
		t.Fatalf("prompt should include default requirement text, got: %s", prompt)
	}
}
