const { request } = require('../utils/request')

const modeService = {
  list: (type) =>
    request({
      url: `/modes${type ? `?type=${type}` : ''}`,
    }),
}

module.exports = {
  modeService,
}
