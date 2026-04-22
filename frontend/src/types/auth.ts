export type User = {
  id: number
  email: string
  name: string
  phone?: string
  image?: string
  role_code?: string
  role_name?: string
  permissions?: string[]
}

export type LoginPayload = { email: string; password: string }
export type RegisterPayload = LoginPayload & { name: string; phone?: string }
export type ResetPasswordPayload = { email: string; new_password: string }

export type AuthResult = { token: string; user: User }
