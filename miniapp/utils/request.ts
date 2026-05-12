import type { ApiResponse } from '../types/api'
import { miniappConfig } from './config'
import { clearSession, getStorageToken } from './session'

type RequestOptions<T> = {
  url: string
  method?: WechatMiniprogram.RequestOption['method']
  data?: Record<string, unknown> | string | number[] | undefined
  withAuth?: boolean
}

export const request = async <T>({
  url,
  method = 'GET',
  data,
  withAuth = true,
}: RequestOptions<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const token = getStorageToken()
    wx.request<ApiResponse<T>>({
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
          reject(new Error(payload?.msg || '登录已失效，请重新登录'))
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300 || !payload) {
          reject(new Error(payload?.msg || '请求失败'))
          return
        }
        resolve(payload.result)
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络异常'))
      },
    })
  })
