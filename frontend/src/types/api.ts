export type ApiResponse<T> = {
  code: number
  msg: string
  result: T
}

export type ApiError = {
  message: string
  status?: number
}
