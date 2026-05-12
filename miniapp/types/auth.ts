export type AuthUser = {
  id: number
  email: string
  name: string
  phone?: string
  image?: string
  role_code: string
  role_name: string
  permissions: string[]
}

export type WechatLoginResult = {
  token: string
  user: AuthUser
}
