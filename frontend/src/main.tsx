import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import InstallPrompt from './components/InstallPrompt'
import OfflineBanner from './components/OfflineBanner'
import UpdatePrompt from './components/UpdatePrompt'
import { useAuthStore } from './store/authStore'
import api from './api/client'
import './i18n'
import './index.css'

/**
 * SessionLoader — runs once on mount.
 * Calls GET /api/auth/me to restore the user from the httpOnly cookie.
 * If the cookie is missing or expired the endpoint returns 401 and we
 * stay unauthenticated (no redirect here — App.tsx route guards handle that).
 */
function SessionLoader({ children }: { children: React.ReactNode }) {
  const { setUser, clearAuth } = useAuthStore()

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => clearAuth())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionLoader>
        <OfflineBanner />
        <App />
        <InstallPrompt />
        <UpdatePrompt />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontSize: '14px' },
          }}
        />
      </SessionLoader>
    </BrowserRouter>
  </React.StrictMode>
)
