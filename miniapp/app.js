const { getStorageToken, isLoggedIn } = require('./utils/session')

App({
  globalData: {
    apiBaseUrl: 'https://kiwix.top:8091/api/v1',
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
