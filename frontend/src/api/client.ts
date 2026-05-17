import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach JWT token to every request from sessionStorage
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sra_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — clear session and redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error.response?.status === 401 &&
      !window.location.pathname.startsWith('/login')
    ) {
      sessionStorage.removeItem('sra_token')
      sessionStorage.removeItem('sra_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
