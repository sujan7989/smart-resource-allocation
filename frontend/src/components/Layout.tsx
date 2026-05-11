import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, AlertTriangle, CheckSquare, Users,
  FileText, User, LogOut, Menu, Shield
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import Logo from './Logo'
import AnimatedBackground from './AnimatedBackground'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'volunteer', 'field_worker'], color: 'text-blue-400' },
  { to: '/needs', label: 'Community Needs', icon: AlertTriangle, roles: ['admin', 'volunteer', 'field_worker'], color: 'text-red-400' },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, roles: ['admin', 'volunteer'], color: 'text-green-400' },
  { to: '/volunteers', label: 'Volunteers', icon: Users, roles: ['admin'], color: 'text-purple-400' },
  { to: '/field-reports', label: 'Field Reports', icon: FileText, roles: ['admin', 'field_worker'], color: 'text-yellow-400' },
  { to: '/admin', label: 'User Management', icon: Shield, roles: ['admin'], color: 'text-indigo-400' },
  { to: '/profile', label: 'My Profile', icon: User, roles: ['admin', 'volunteer', 'field_worker'], color: 'text-cyan-400' },
]

const roleColors: Record<string, string> = {
  admin: 'from-purple-500 to-indigo-500',
  volunteer: 'from-blue-500 to-cyan-500',
  field_worker: 'from-green-500 to-emerald-500',
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role))

  return (
    <div className="flex h-screen animated-bg overflow-hidden">
      <AnimatedBackground />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : undefined }}
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col',
          'bg-slate-900/95 backdrop-blur-xl border-r border-white/5',
          'transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <Logo size="sm" />
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleColors[user?.role || 'volunteer']} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
              <span className={`text-xs bg-gradient-to-r ${roleColors[user?.role || 'volunteer']} bg-clip-text text-transparent font-medium capitalize`}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map(({ to, label, icon: Icon, color }) => {
            const isActive = location.pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
              >
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/20 shadow-glow-blue'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon size={18} className={isActive ? color : ''} />
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"
                    />
                  )}
                </motion.div>
              </NavLink>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/5">
          <motion.button
            onClick={handleLogout}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={18} />
            Sign Out
          </motion.button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white transition-colors">
            <Menu size={22} />
          </button>
          <Logo size="sm" />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="p-6 min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
