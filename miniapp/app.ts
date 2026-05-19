import { getStorageToken, getStorageUser, isLoggedIn, getSelectedMode, getExplainContext } from './utils/session'

App<IAppOption>({
  globalData: {
    apiBaseUrl: 'https://kiwix.top:8091/api/v1',
    token: getStorageToken(),
    user: getStorageUser(),
    selectedMode: getSelectedMode(),
    explainContext: getExplainContext(),
  },
  onLaunch() {
    this.globalData.token = getStorageToken()
    this.globalData.user = getStorageUser()
    this.globalData.selectedMode = getSelectedMode()
    this.globalData.explainContext = getExplainContext()
  },
  isAuthed() {
    return isLoggedIn()
  },
})
