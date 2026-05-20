declare interface IAppOption {
  globalData: {
    apiBaseUrl: string
    token: string
    user: import('../types/auth').AuthUser | null
    selectedMode: import('../types/mode').StudyMode | null
    explainContext: import('../types/question').ExplainChatPageContext | null
    settingsPanel?: 'none' | 'profile' | 'theme' | 'word' | 'permission'
    openOnboardingModal?: boolean
  }
  isAuthed: () => boolean
}
