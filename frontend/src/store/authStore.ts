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
  isAuthenticated: boolean
  isLoading: boolean          // true while /api/auth/me is in-flight on app load
  setUser: (user: User) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

/**
 * Auth state lives entirely in memory.
 * The JWT is stored in a httpOnly cookie set by the backend — JavaScript
 * cannot read or write it, which eliminates XSS token theft.
 *
 * On app load, App.tsx calls GET /api/auth/me to restore the session.
 * On logout, POST /api/auth/logout tells the backend to clear the cookie.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,   // start as loading — App.tsx resolves this on mount

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  clearAuth: () => set({ user: null, isAuthenticated: false, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),
}))
