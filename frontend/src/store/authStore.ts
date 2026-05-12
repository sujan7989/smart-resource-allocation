import { create } from 'zustand'

export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'volunteer' | 'field_worker'
  is_active: boolean
  phone?: string
  location?: string
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
}

/** Check if a JWT token is expired without verifying the signature. */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // exp is in seconds; Date.now() is in milliseconds
    return payload.exp * 1000 < Date.now()
  } catch {
    return true // malformed token — treat as expired
  }
}

function loadInitialAuth(): { user: User | null; token: string | null; isAuthenticated: boolean } {
  try {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      return { user: null, token: null, isAuthenticated: false }
    }

    // Clear expired tokens on app load — prevents stale auth state
    if (isTokenExpired(token)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return { user: null, token: null, isAuthenticated: false }
    }

    const user: User = JSON.parse(userStr)
    return { user, token, isAuthenticated: true }
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return { user: null, token: null, isAuthenticated: false }
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitialAuth(),

  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
