package router

import (
	"time"

	"study_english/backend/internal/handler"
	"study_english/backend/internal/middleware"
	"study_english/backend/internal/pkg/authz"
	"study_english/backend/internal/pkg/logger"
	"study_english/backend/internal/repository"
	"study_english/backend/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Build builds gin router with dependencies.
func Build(
	repo *repository.Repository,
	jwtSecret,
	llmAPIKey,
	llmEndpoint,
	llmModelGenerate,
	llmModelAnalyze,
	llmModelChat,
	llmPromptFile,
	llmAnalyzePromptFile string,
	llmAnalyzeRepairPromptFile string,
	llmChatPromptFile string,
	llmStreamEnabled bool,
	preheatEnabled bool,
	preheatIntervalSec int,
	preheatServeTimeoutM int,
	preheatTargetWS int,
	preheatTargetArticle int,
) *gin.Engine {
	logger.L().Info("router build start", zap.String("request_id", "-"))
	if err := repo.EnsureRBACSeed("-"); err != nil {
		logger.L().Error("seed rbac failed", zap.String("request_id", "-"), zap.Error(err))
	}
	engine := gin.New()
	engine.Use(middleware.RequestID(), middleware.RequestLogger(), middleware.Recovery(), cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authService := service.NewAuthService(repo, jwtSecret)
	modeService := service.NewModeService(repo)
	themeService := service.NewThemeService(repo)
	permissionService := service.NewPermissionService(repo)
	questionService := service.NewQuestionService(
		repo,
		llmAPIKey,
		llmEndpoint,
		llmModelGenerate,
		llmModelAnalyze,
		llmModelChat,
		llmPromptFile,
		llmAnalyzePromptFile,
		llmAnalyzeRepairPromptFile,
		llmChatPromptFile,
		llmStreamEnabled,
		preheatEnabled,
		preheatIntervalSec,
		preheatServeTimeoutM,
		preheatTargetWS,
		preheatTargetArticle,
	)
	scoreService := service.NewScoreService(repo)

	authHandler := handler.NewAuthHandler(authService)
	modeHandler := handler.NewModeHandler(modeService)
	themeHandler := handler.NewThemeHandler(themeService)
	permissionHandler := handler.NewPermissionHandler(permissionService)
	questionHandler := handler.NewQuestionHandler(questionService)
	scoreHandler := handler.NewScoreHandler(scoreService)

	v1 := engine.Group("/api/v1")
	authGroup := v1.Group("/auth")
	authGroup.POST("/register", authHandler.Register)
	authGroup.POST("/login", authHandler.Login)
	authGroup.POST("/reset-password", authHandler.ResetPassword)

	protected := v1.Group("")
	protected.Use(middleware.Auth(jwtSecret, repo))
	protected.GET("/auth/me", authHandler.Me)
	protected.GET("/modes", modeHandler.List)
	protected.POST("/modes", modeHandler.Create)
	protected.PUT("/modes/:id", modeHandler.Update)
	protected.DELETE("/modes/:id", modeHandler.Delete)

	protected.GET("/themes", themeHandler.List)
	settingsGroup := protected.Group("")
	settingsGroup.Use(middleware.RequirePermission(authz.PermSettingsThemeManage))
	settingsGroup.POST("/themes", themeHandler.Create)
	settingsGroup.PUT("/themes/:id", themeHandler.Update)
	settingsGroup.DELETE("/themes/:id", themeHandler.Delete)

	permissionGroup := protected.Group("")
	permissionGroup.Use(middleware.RequirePermission(authz.PermSettingsPermissionEdit))
	permissionGroup.GET("/permissions", permissionHandler.Snapshot)
	permissionGroup.GET("/users/roles", permissionHandler.ListUserRoles)
	permissionGroup.PUT("/users/:id/role", permissionHandler.UpdateUserRole)
	permissionGroup.PUT("/roles/:id/permissions", permissionHandler.UpdateRolePermissions)

	practiceGroup := protected.Group("")
	practiceGroup.Use(middleware.RequirePermission(authz.PermPracticeUse))
	practiceGroup.POST("/questions/generate", questionHandler.Generate)
	practiceGroup.POST("/questions/generate/stream", questionHandler.GenerateStream)
	practiceGroup.POST("/questions/analyze", questionHandler.Analyze)
	practiceGroup.POST("/questions", questionHandler.Create)
	practiceGroup.PUT("/questions/:id", questionHandler.Update)
	practiceGroup.DELETE("/questions/:id", questionHandler.Delete)

	chatGroup := protected.Group("")
	chatGroup.Use(middleware.RequirePermission(authz.PermChatUse))
	chatGroup.POST("/questions/explain/chat", questionHandler.ExplainChat)

	protected.GET("/questions", questionHandler.List)
	protected.GET("/scores/today", scoreHandler.Today)
	protected.POST("/scores/recalculate", scoreHandler.Recalculate)

	logger.L().Info("router build success", zap.String("request_id", "-"))
	return engine
}
