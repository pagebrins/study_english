import axios from 'axios'
import type { ApiResponse } from '../types/api'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'
const requestTimeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 120000)

export const http = axios.create({ baseURL, timeout: requestTimeoutMs })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.msg ?? error.message ?? 'Unknown error'
    return Promise.reject(new Error(message))
  },
)

/**
 * Extract typed API result.
 */
export const getResult = <T>(promise: Promise<{ data: ApiResponse<T> }>) =>
  promise.then((res) => res.data.result)
