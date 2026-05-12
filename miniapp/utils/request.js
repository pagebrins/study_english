const { miniappConfig } = require('./config')
const { clearSession, getStorageToken } = require('./session')

const request = ({ url, method = 'GET', data, withAuth = true }) =>
  new Promise((resolve, reject) => {
    const token = getStorageToken()
    wx.request({
      url: `${miniappConfig.apiBaseUrl}${url}`,
      method,
      timeout: miniappConfig.requestTimeoutMs,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(withAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        const payload = res.data
        if (res.statusCode === 401) {
          clearSession()
          reject(new Error((payload && payload.msg) || '登录已失效，请重新登录'))
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300 || !payload) {
          reject(new Error((payload && payload.msg) || '请求失败'))
          return
        }
        resolve(payload.result)
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络异常'))
      },
    })
  })

module.exports = {
  request,
}
