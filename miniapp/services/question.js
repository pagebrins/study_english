const { request } = require('../utils/request')

const questionService = {
  generate: (modeID) =>
    request({
      url: '/questions/generate',
      method: 'POST',
      data: { mode_id: modeID },
    }),
  analyze: (payload) =>
    request({
      url: '/questions/analyze',
      method: 'POST',
      data: payload,
    }),
  create: (payload) =>
    request({
      url: '/questions',
      method: 'POST',
      data: payload,
    }),
  list: (filters) => {
    const query = [
      filters.type ? `type=${filters.type}` : '',
      filters.mode_ids && filters.mode_ids.length ? `mode_ids=${filters.mode_ids.join(',')}` : '',
      filters.min_score !== undefined ? `min_score=${filters.min_score}` : '',
      filters.max_score !== undefined ? `max_score=${filters.max_score}` : '',
      filters.start_date ? `start_date=${encodeURIComponent(filters.start_date)}` : '',
      filters.end_date ? `end_date=${encodeURIComponent(filters.end_date)}` : '',
    ]
      .filter(Boolean)
      .join('&')
    return request({
      url: `/questions${query ? `?${query}` : ''}`,
    })
  },
  explainChat: (payload) =>
    request({
      url: '/questions/explain/chat',
      method: 'POST',
      data: payload,
    }),
}

module.exports = {
  questionService,
}
