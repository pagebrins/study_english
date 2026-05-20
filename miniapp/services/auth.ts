import type { AuthUser, WechatLoginResult } from '../types/auth'
import { request } from '../utils/request'

export const authService = {
  wechatLogin: (code: string, name?: string) =>
    request<WechatLoginResult>({
      url: '/auth/wechat-mini-login',
      method: 'POST',
      withAuth: false,
      data: { code, name },
    }),
  me: () => request<AuthUser>({ url: '/auth/me' }),
}
