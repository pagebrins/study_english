import type { AuthResult, LoginPayload, RegisterPayload, ResetPasswordPayload, User } from '../types/auth'
import { getResult, http } from './http'

const apiBaseURL = String(http.defaults.baseURL ?? '')

const resolveAPIURL = (path: string) => {
  const normalizedBaseURL = apiBaseURL.replace(/\/$/, '')
  if (/^https?:\/\//.test(apiBaseURL)) {
    return `${normalizedBaseURL}${path}`
  }
  return `${window.location.origin}${normalizedBaseURL}${path}`
}

export const authApi = {
  login: (payload: LoginPayload) =>
    getResult<AuthResult>(http.post('/auth/login', payload)),
  register: (payload: RegisterPayload) =>
    getResult<AuthResult>(http.post('/auth/register', payload)),
  resetPassword: (payload: ResetPasswordPayload) =>
    getResult<boolean>(http.post('/auth/reset-password', payload)),
  me: () => getResult<User>(http.get('/auth/me')),
  getWechatWebLoginURL: () => resolveAPIURL('/auth/wechat-web/start'),
}
