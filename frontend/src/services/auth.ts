import type { AuthResult, LoginPayload, RegisterPayload, ResetPasswordPayload, User } from '../types/auth'
import { getResult, http } from './http'

export const authApi = {
  login: (payload: LoginPayload) =>
    getResult<AuthResult>(http.post('/auth/login', payload)),
  register: (payload: RegisterPayload) =>
    getResult<AuthResult>(http.post('/auth/register', payload)),
  resetPassword: (payload: ResetPasswordPayload) =>
    getResult<boolean>(http.post('/auth/reset-password', payload)),
  me: () => getResult<User>(http.get('/auth/me')),
}
