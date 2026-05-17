import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,        // 15 second timeout — prevents infinite loading on hung requests
  withCredentials: true, // send the httpOnly auth cookie on every cross-origin request
})

// Handle 401 globally — redirect to login, but avoid redirect loop if already there.
// No localStorage to clear — the cookie is managed entirely by the browser/backend.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error.response?.status === 401 &&
      !window.location.pathname.startsWith('/login')
    ) {
      // Cookie is expired or invalid — send user to login.
      // The backend's POST /api/auth/logout will clear the cookie on next explicit logout.
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
