package authz

const (
	RoleAdmin   = "admin"
	RoleLearner = "learner"
	RoleGuest   = "guest"

	PermDashboardView          = "dashboard.view"
	PermModesManage            = "modes.manage"
	PermStudyView              = "study.view"
	PermHistoryView            = "history.view"
	PermPracticeUse            = "practice.use"
	PermChatUse                = "chat.use"
	PermSettingsThemeManage    = "settings.theme.manage"
	PermSettingsPermissionEdit = "settings.permission.manage"
)

var DefaultRoleSeeds = []struct {
	Code        string
	Name        string
	Description string
}{
	{Code: RoleAdmin, Name: "Admin", Description: "Full access"},
	{Code: RoleLearner, Name: "Learner", Description: "All except settings"},
	{Code: RoleGuest, Name: "Guest", Description: "No settings/chat/practice"},
}

var DefaultPermissionSeeds = []struct {
	Code        string
	Name        string
	Description string
}{
	{Code: PermDashboardView, Name: "Dashboard View", Description: "Access dashboard pages"},
	{Code: PermModesManage, Name: "Modes Manage", Description: "Access and manage modes"},
	{Code: PermStudyView, Name: "Study View", Description: "Access study pages"},
	{Code: PermHistoryView, Name: "History View", Description: "Access history pages"},
	{Code: PermPracticeUse, Name: "Practice Use", Description: "Use practice generate/submit"},
	{Code: PermChatUse, Name: "Chat Use", Description: "Use help chat panel"},
	{Code: PermSettingsThemeManage, Name: "Theme Settings", Description: "Manage theme settings"},
	{Code: PermSettingsPermissionEdit, Name: "Permission Settings", Description: "Manage permission settings"},
}

var DefaultRolePermissionCodes = map[string][]string{
	RoleAdmin: {
		PermDashboardView,
		PermModesManage,
		PermStudyView,
		PermHistoryView,
		PermPracticeUse,
		PermChatUse,
		PermSettingsThemeManage,
		PermSettingsPermissionEdit,
	},
	RoleLearner: {
		PermDashboardView,
		PermModesManage,
		PermStudyView,
		PermHistoryView,
		PermPracticeUse,
		PermChatUse,
	},
	RoleGuest: {
		PermDashboardView,
		PermModesManage,
		PermStudyView,
		PermHistoryView,
	},
}
