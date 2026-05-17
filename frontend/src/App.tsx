import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import NeedsPage from './pages/NeedsPage'
import TasksPage from './pages/TasksPage'
import VolunteersPage from './pages/VolunteersPage'
import FieldReportsPage from './pages/FieldReportsPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import MapPage from './pages/MapPage'
import ImpactPage from './pages/ImpactPage'
import NotFoundPage from './pages/NotFoundPage'
import Layout from './components/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return <AppLoader />
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return <AppLoader />
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />
}

function RoleRoute({
  children,
  roles,
}: {
  children: React.ReactNode
  roles: Array<'admin' | 'volunteer' | 'field_worker'>
}) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return <AppLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Full-screen spinner shown while the session cookie is being validated. */
function AppLoader() {
  return (
    <div className="min-h-screen animated-bg flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password"  element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="dashboard"     element={<DashboardPage />} />
        <Route path="needs"         element={<NeedsPage />} />
        <Route path="map"           element={<MapPage />} />
        <Route path="tasks"         element={<TasksPage />} />
        <Route path="field-reports" element={<FieldReportsPage />} />
        <Route path="profile"       element={<ProfilePage />} />

        <Route path="volunteers" element={
          <RoleRoute roles={['admin']}><VolunteersPage /></RoleRoute>
        } />
        <Route path="impact" element={
          <RoleRoute roles={['admin']}><ImpactPage /></RoleRoute>
        } />
        <Route path="admin" element={
          <RoleRoute roles={['admin']}><AdminPage /></RoleRoute>
        } />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
