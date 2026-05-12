import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import NeedsPage from './pages/NeedsPage'
import TasksPage from './pages/TasksPage'
import VolunteersPage from './pages/VolunteersPage'
import FieldReportsPage from './pages/FieldReportsPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import NotFoundPage from './pages/NotFoundPage'
import Layout from './components/Layout'

/** Redirect unauthenticated users to /login */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/** Redirect already-authenticated users away from login/register */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />
}

/** Restrict a route to specific roles; redirect others to /dashboard */
function RoleRoute({
  children,
  roles,
}: {
  children: React.ReactNode
  roles: Array<'admin' | 'volunteer' | 'field_worker'>
}) {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="needs" element={<NeedsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route
          path="volunteers"
          element={
            <RoleRoute roles={['admin']}>
              <VolunteersPage />
            </RoleRoute>
          }
        />
        <Route path="field-reports" element={<FieldReportsPage />} />
        <Route
          path="admin"
          element={
            <RoleRoute roles={['admin']}>
              <AdminPage />
            </RoleRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
