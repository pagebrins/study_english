package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"study_english/backend/internal/pkg/logger"

	"github.com/joho/godotenv"
	"go.uber.org/zap"
)

// Config contains runtime settings.
type Config struct {
	Port                       string
	DBDriver                   string
	DBPath                     string
	MySQLDSN                   string
	JWTSecret                  string
	LLMAPIKey                  string
	LLMEndpoint                string
	LLMModelGenerate           string
	LLMModelAnalyze            string
	LLMModelChat               string
	LLMPromptFile              string
	LLMAnalyzePromptFile       string
	LLMAnalyzeRepairPromptFile string
	LLMChatPromptFile          string
	LLMStreamEnabled           bool
	PreheatEnabled             bool
	PreheatIntervalSec         int
	PreheatServeTimeoutM       int
	PreheatTargetWS            int
	PreheatTargetArticle       int
}

// Load loads env vars from specified file with strict validation.
func Load(configPath string) (Config, error) {
	if strings.TrimSpace(configPath) == "" {
		return Config{}, fmt.Errorf("config path is required")
	}
	if err := godotenv.Overload(configPath); err != nil {
		return Config{}, fmt.Errorf("load config file failed: %w", err)
	}
	missing := make([]string, 0)
	port := requireEnv("PORT", &missing)
	dbDriver := requireEnv("DB_DRIVER", &missing)
	jwtSecret := requireEnv("JWT_SECRET", &missing)
	llmEndpoint := requireEnvAny([]string{"LLM_ENDPOINT", "DOUBAO_ENDPOINT"}, "LLM_ENDPOINT/DOUBAO_ENDPOINT", &missing)
	legacyModel := optionalEnvAny([]string{"LLM_MODEL"})
	llmModelGenerate := firstNonEmpty(
		optionalEnvAny([]string{"LLM_MODEL_GENERATE_QUESTIONS", "LLM_MODEL_GENERATE"}),
		legacyModel,
	)
	llmModelAnalyze := firstNonEmpty(
		optionalEnvAny([]string{"LLM_MODEL_SUBMIT_ANSWER", "LLM_MODEL_ANALYZE"}),
		legacyModel,
	)
	llmModelChat := firstNonEmpty(
		optionalEnvAny([]string{"LLM_MODEL_CHAT"}),
		legacyModel,
	)
	if strings.TrimSpace(llmModelGenerate) == "" {
		missing = append(missing, "LLM_MODEL_GENERATE_QUESTIONS(or LLM_MODEL)")
	}
	if strings.TrimSpace(llmModelAnalyze) == "" {
		missing = append(missing, "LLM_MODEL_SUBMIT_ANSWER(or LLM_MODEL)")
	}
	if strings.TrimSpace(llmModelChat) == "" {
		missing = append(missing, "LLM_MODEL_CHAT(or LLM_MODEL)")
	}
	llmPromptFile := requireEnv("LLM_PROMPT_FILE", &missing)
	llmAnalyzePromptFile := requireEnv("LLM_ANALYZE_PROMPT_FILE", &missing)
	llmAnalyzeRepairPromptFile := optionalEnvAny([]string{"LLM_ANALYZE_REPAIR_PROMPT_FILE"})
	if strings.TrimSpace(llmAnalyzeRepairPromptFile) == "" {
		llmAnalyzeRepairPromptFile = "backend/prompts/repair_analyze_output.md"
	}
	llmChatPromptFile := optionalEnvAny([]string{"LLM_CHAT_PROMPT_FILE"})
	if strings.TrimSpace(llmChatPromptFile) == "" {
		llmChatPromptFile = "backend/prompts/explain_chat.md"
	}
	llmStreamEnabled := requireBoolEnv("LLM_STREAM_ENABLED", &missing)
	preheatEnabled := optionalBoolEnv("PREHEAT_ENABLED", true)
	preheatIntervalSec := optionalIntEnv("PREHEAT_INTERVAL_SEC", 10)
	preheatServeTimeoutM := optionalIntEnv("PREHEAT_SERVED_TIMEOUT_MIN", 30)
	preheatTargetWS := optionalIntEnv("PREHEAT_TARGET_WORD_SENTENCE", 100)
	preheatTargetArticle := optionalIntEnv("PREHEAT_TARGET_ARTICLE", 3)
	cfg := Config{
		Port:                       port,
		DBDriver:                   dbDriver,
		JWTSecret:                  jwtSecret,
		LLMAPIKey:                  optionalEnvAny([]string{"LLM_API_KEY", "DOUBAO_API_KEY"}),
		LLMEndpoint:                llmEndpoint,
		LLMModelGenerate:           llmModelGenerate,
		LLMModelAnalyze:            llmModelAnalyze,
		LLMModelChat:               llmModelChat,
		LLMPromptFile:              llmPromptFile,
		LLMAnalyzePromptFile:       llmAnalyzePromptFile,
		LLMAnalyzeRepairPromptFile: llmAnalyzeRepairPromptFile,
		LLMChatPromptFile:          llmChatPromptFile,
		LLMStreamEnabled:           llmStreamEnabled,
		PreheatEnabled:             preheatEnabled,
		PreheatIntervalSec:         preheatIntervalSec,
		PreheatServeTimeoutM:       preheatServeTimeoutM,
		PreheatTargetWS:            preheatTargetWS,
		PreheatTargetArticle:       preheatTargetArticle,
	}
	switch cfg.DBDriver {
	case "mysql":
		cfg.MySQLDSN = requireEnv("MYSQL_DSN", &missing)
	case "sqlite":
		cfg.DBPath = requireEnv("DB_PATH", &missing)
	default:
		if strings.TrimSpace(cfg.DBDriver) != "" {
			return Config{}, fmt.Errorf("unsupported DB_DRIVER: %s", cfg.DBDriver)
		}
	}
	if len(missing) > 0 {
		return Config{}, fmt.Errorf("missing required config: %s", strings.Join(uniqueStrings(missing), ", "))
	}
	logger.L().Info("config loaded",
		zap.String("request_id", "-"),
		zap.String("config_path", configPath),
		zap.String("db_driver", cfg.DBDriver),
		zap.String("llm_endpoint", cfg.LLMEndpoint),
		zap.String("llm_model_generate_questions", cfg.LLMModelGenerate),
		zap.String("llm_model_submit_answer", cfg.LLMModelAnalyze),
		zap.String("llm_model_chat", cfg.LLMModelChat),
		zap.Bool("llm_stream_enabled", cfg.LLMStreamEnabled),
		zap.Bool("preheat_enabled", cfg.PreheatEnabled),
		zap.Int("preheat_interval_sec", cfg.PreheatIntervalSec),
		zap.Int("preheat_served_timeout_min", cfg.PreheatServeTimeoutM),
		zap.Int("preheat_target_word_sentence", cfg.PreheatTargetWS),
		zap.Int("preheat_target_article", cfg.PreheatTargetArticle),
	)
	return cfg, nil
}

func requireEnv(key string, missing *[]string) string {
	value, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(value) == "" {
		*missing = append(*missing, key)
		return ""
	}
	return value
}

func requireEnvAny(keys []string, label string, missing *[]string) string {
	for _, key := range keys {
		value, ok := os.LookupEnv(key)
		if ok && strings.TrimSpace(value) != "" {
			return value
		}
	}
	*missing = append(*missing, label)
	return ""
}

func optionalEnvAny(keys []string) string {
	for _, key := range keys {
		if value, ok := os.LookupEnv(key); ok {
			return value
		}
	}
	return ""
}

func requireBoolEnv(key string, missing *[]string) bool {
	value, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(value) == "" {
		*missing = append(*missing, key)
		return false
	}
	parsed, err := strconv.ParseBool(strings.TrimSpace(value))
	if err != nil {
		*missing = append(*missing, key)
		return false
	}
	return parsed
}

func optionalBoolEnv(key string, defaultValue bool) bool {
	value, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(value) == "" {
		return defaultValue
	}
	parsed, err := strconv.ParseBool(strings.TrimSpace(value))
	if err != nil {
		return defaultValue
	}
	return parsed
}

func optionalIntEnv(key string, defaultValue int) int {
	value, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(value) == "" {
		return defaultValue
	}
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return defaultValue
	}
	return parsed
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	unique := make([]string, 0, len(values))
	for _, value := range values {
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		unique = append(unique, value)
	}
	return unique
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
