import { getStorageToken, isLoggedIn } from './utils/session'

App<IAppOption>({
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
