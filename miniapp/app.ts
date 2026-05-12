import { getStorageToken, isLoggedIn } from './utils/session'

App<IAppOption>({
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
