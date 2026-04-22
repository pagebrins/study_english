package main

import (
	"flag"
	"os"
	"strings"

	"study_english/backend/internal/pkg/config"
	"study_english/backend/internal/pkg/db"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/repository"
	"study_english/backend/internal/router"

	"go.uber.org/zap"
)

func main() {
	if err := logger.Init(); err != nil {
		panic(err)
	}
	configPath := flag.String("config", "", "path to backend env config file")
	flag.Parse()
	if strings.TrimSpace(*configPath) == "" {
		logger.L().Error("config path is required", zap.String("request_id", "-"))
		os.Exit(1)
	}
	cfg, err := config.Load(*configPath)
	if err != nil {
		logger.L().Error("load config failed", zap.String("request_id", "-"), zap.Error(err))
		os.Exit(1)
	}
	database, err := db.New(cfg.DBDriver, cfg.DBPath, cfg.MySQLDSN)
	if err != nil {
		logger.L().Error("db init failed", zap.String("request_id", "-"), zap.Error(err))
		os.Exit(1)
	}
	repo := repository.New(database)
	engine := router.Build(
		repo,
		cfg.JWTSecret,
		cfg.LLMAPIKey,
		cfg.LLMEndpoint,
		cfg.LLMModelGenerate,
		cfg.LLMModelAnalyze,
		cfg.LLMModelChat,
		cfg.LLMPromptFile,
		cfg.LLMAnalyzePromptFile,
		cfg.LLMAnalyzeRepairPromptFile,
		cfg.LLMChatPromptFile,
		cfg.LLMStreamEnabled,
		cfg.PreheatEnabled,
		cfg.PreheatIntervalSec,
		cfg.PreheatServeTimeoutM,
		cfg.PreheatTargetWS,
		cfg.PreheatTargetArticle,
	)
	logger.L().Info("server running", zap.String("request_id", "-"), zap.String("port", cfg.Port))
	if err := engine.Run(":" + cfg.Port); err != nil {
		logger.L().Error("server failed", zap.String("request_id", "-"), zap.Error(err))
		os.Exit(1)
	}
}
