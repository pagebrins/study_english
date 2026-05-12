const { request } = require('../utils/request')

const authService = {
  wechatLogin: (code) =>
    request({
      url: '/auth/wechat-mini-login',
      method: 'POST',
      withAuth: false,
      data: { code },
    }),
  me: () =>
    request({
      url: '/auth/me',
    }),
}

module.exports = {
  authService,
}
