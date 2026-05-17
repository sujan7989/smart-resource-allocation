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
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

/**
 * Token storage strategy:
 * - Primary: Zustand in-memory (fastest, most secure)
 * - Fallback: sessionStorage (survives page refresh within the same tab,
 *   cleared automatically when the browser tab/window is closed,
 *   NOT shared across tabs, NOT accessible from other origins)
 *
 * Why NOT localStorage: persists forever, accessible to any JS on the page.
 * Why NOT httpOnly cookie: doesn't work cross-domain (Vercel ↔ Render).
 * Why sessionStorage: best balance of security and UX for cross-domain SPAs.
 */
const SESSION_TOKEN_KEY = 'sra_token'
const SESSION_USER_KEY  = 'sra_user'

function loadInitialAuth(): { user: User | null; token: string | null; isAuthenticated: boolean } {
  try {
    const token   = sessionStorage.getItem(SESSION_TOKEN_KEY)
    const userStr = sessionStorage.getItem(SESSION_USER_KEY)
    if (!token || !userStr) return { user: null, token: null, isAuthenticated: false }

    // Quick client-side expiry check — avoids a 401 on the first API call
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) {
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
      sessionStorage.removeItem(SESSION_USER_KEY)
      return { user: null, token: null, isAuthenticated: false }
    }

    return { user: JSON.parse(userStr), token, isAuthenticated: true }
  } catch {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    sessionStorage.removeItem(SESSION_USER_KEY)
    return { user: null, token: null, isAuthenticated: false }
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitialAuth(),
  isLoading: false,

  setAuth: (user, token) => {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token)
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))
    set({ user, token, isAuthenticated: true, isLoading: false })
  },

  clearAuth: () => {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    sessionStorage.removeItem(SESSION_USER_KEY)
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (loading) => set({ isLoading: loading }),
}))
