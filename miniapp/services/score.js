const { request } = require('../utils/request')

const scoreService = {
  today: (type) =>
    request({
      url: `/scores/today${type ? `?type=${type}` : ''}`,
    }),
}

module.exports = {
  scoreService,
}
