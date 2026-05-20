package authz

const (
	RoleAdmin   = "admin"
	RoleLearner = "learner"
	RoleGuest   = "guest"

	PermDashboardView           = "dashboard.view"
	PermStudyView               = "study.view"
	PermHistoryView             = "history.view"
	PermPracticeUse             = "practice.use"
	PermChatUse                 = "chat.use"
	PermSettingsThemeManage     = "settings.theme.manage"
	PermSettingsKnowledgeManage = "settings.knowledge.manage"
	PermSettingsPermissionEdit  = "settings.permission.manage"
)

var DefaultRoleSeeds = []struct {
	Code        string
	Name        string
	Description string
}{
	{Code: RoleAdmin, Name: "Admin", Description: "Full access"},
	{Code: RoleLearner, Name: "Learner", Description: "All except settings"},
	{Code: RoleGuest, Name: "Guest", Description: "No settings/chat"},
}

var DefaultPermissionSeeds = []struct {
	Code        string
	Name        string
	Description string
}{
	{Code: PermDashboardView, Name: "Dashboard View", Description: "Access dashboard pages"},
	{Code: PermStudyView, Name: "Study View", Description: "Access study pages"},
	{Code: PermHistoryView, Name: "History View", Description: "Access history pages"},
	{Code: PermPracticeUse, Name: "Practice Use", Description: "Use practice generate/submit"},
	{Code: PermChatUse, Name: "Chat Use", Description: "Use help chat panel"},
	{Code: PermSettingsThemeManage, Name: "Theme Settings", Description: "Manage theme settings"},
	{Code: PermSettingsKnowledgeManage, Name: "Knowledge Settings", Description: "Manage word knowledge base"},
	{Code: PermSettingsPermissionEdit, Name: "Permission Settings", Description: "Manage permission settings"},
}

var DefaultRolePermissionCodes = map[string][]string{
	RoleAdmin: {
		PermDashboardView,
		PermStudyView,
		PermHistoryView,
		PermPracticeUse,
		PermChatUse,
		PermSettingsThemeManage,
		PermSettingsKnowledgeManage,
		PermSettingsPermissionEdit,
	},
	RoleLearner: {
		PermDashboardView,
		PermStudyView,
		PermHistoryView,
		PermPracticeUse,
		PermChatUse,
	},
	RoleGuest: {
		PermDashboardView,
		PermStudyView,
		PermHistoryView,
		PermPracticeUse,
	},
}
