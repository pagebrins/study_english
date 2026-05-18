const miniappConfig = {
  apiBaseUrl: 'https://kiwix.top:8091/api/v1',
  requestTimeoutMs: 120000,
  storageKeys: {
    token: 'study_english_token',
    user: 'study_english_user',
    selectedMode: 'study_english_selected_mode',
    explainContext: 'study_english_explain_context',
  },
}

module.exports = {
  miniappConfig,
}
