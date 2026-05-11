import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, AlertTriangle, CheckSquare, Users,
  FileText, User, LogOut, Menu, X, Heart
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'volunteer', 'field_worker'] },
  { to: '/needs', label: 'Community Needs', icon: AlertTriangle, roles: ['admin', 'volunteer', 'field_worker'] },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, roles: ['admin', 'volunteer'] },
  { to: '/volunteers', label: 'Volunteers', icon: Users, roles: ['admin'] },
  { to: '/field-reports', label: 'Field Reports', icon: FileText, roles: ['admin', 'field_worker'] },
  { to: '/profile', label: 'My Profile', icon: User, roles: ['admin', 'volunteer', 'field_worker'] },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role))

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-primary-900 text-white flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-700">
          <div className="bg-primary-500 rounded-lg p-2">
            <Heart size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Smart Resource</p>
            <p className="text-primary-300 text-xs">Allocation Platform</p>
          </div>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-primary-700">
          <p className="text-sm font-medium truncate">{user?.full_name}</p>
          <span className="text-xs bg-primary-700 text-primary-200 px-2 py-0.5 rounded-full capitalize">
            {user?.role?.replace('_', ' ')}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              )}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-primary-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-primary-200 hover:bg-primary-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-gray-800">Smart Resource Allocation</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
