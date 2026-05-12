const { getStorageToken, isLoggedIn } = require('./utils/session')

App({
  globalData: {
    apiBaseUrl: 'https://example.com/api/v1',
    token: getStorageToken(),
    user: null,
    selectedMode: null,
    explainContext: null,
  },
  onLaunch() {
    this.globalData.token = getStorageToken()
  },
  isAuthed() {
    return isLoggedIn()
  },
})
