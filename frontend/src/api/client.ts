import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15 second timeout — prevents infinite loading on hung requests
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — redirect to login, but avoid redirect loop if already there
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error.response?.status === 401 &&
      !window.location.pathname.startsWith('/login')
    ) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
