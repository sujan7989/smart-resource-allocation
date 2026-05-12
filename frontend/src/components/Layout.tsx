import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, AlertTriangle, CheckSquare, Users,
  FileText, User, LogOut, Menu, Shield, MapPin, TrendingUp,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import Logo from './Logo'
import AnimatedBackground from './AnimatedBackground'
import LanguageSelector from './LanguageSelector'
import api from '../api/client'

const navItems = [
  { to: '/dashboard',    labelKey: 'nav.dashboard',    icon: LayoutDashboard, roles: ['admin', 'volunteer', 'field_worker'], color: 'text-blue-400'   },
  { to: '/needs',        labelKey: 'nav.needs',         icon: AlertTriangle,   roles: ['admin', 'volunteer', 'field_worker'], color: 'text-red-400'    },
  { to: '/map',          labelKey: 'map.title',         icon: MapPin,          roles: ['admin', 'volunteer', 'field_worker'], color: 'text-cyan-400'   },
  { to: '/tasks',        labelKey: 'nav.tasks',         icon: CheckSquare,     roles: ['admin', 'volunteer'],                 color: 'text-green-400'  },
  { to: '/volunteers',   labelKey: 'nav.volunteers',    icon: Users,           roles: ['admin'],                              color: 'text-purple-400' },
  { to: '/field-reports',labelKey: 'nav.fieldReports',  icon: FileText,        roles: ['admin', 'field_worker'],              color: 'text-yellow-400' },
  { to: '/impact',       labelKey: 'impact.title',      icon: TrendingUp,      roles: ['admin'],                              color: 'text-orange-400' },
  { to: '/admin',        labelKey: 'nav.admin',         icon: Shield,          roles: ['admin'],                              color: 'text-indigo-400' },
  { to: '/profile',      labelKey: 'nav.profile',       icon: User,            roles: ['admin', 'volunteer', 'field_worker'], color: 'text-cyan-400'   },
]

const roleColors: Record<string, string> = {
  admin:        'from-purple-500 to-indigo-500',
  volunteer:    'from-blue-500 to-cyan-500',
  field_worker: 'from-green-500 to-emerald-500',
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // Lightweight pending-count poll — admin only
  useEffect(() => {
    if (user?.role !== 'admin') return
    const fetchPending = () => {
      api.get('/assignments/pending-count')
        .then(r => setPendingCount(r.data.count ?? 0))
        .catch(() => {})
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30_000)
    return () => clearInterval(interval)
  }, [user])

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

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <motion.aside
        initial={false}
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col',
          'bg-slate-900/95 backdrop-blur-xl border-r border-white/5',
          'transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
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
                {t(`common.roles.${user?.role}`, { defaultValue: user?.role?.replace('_', ' ') })}
              </span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNav.map(({ to, labelKey, icon: Icon, color }) => {
            const isActive = location.pathname === to
            return (
              <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5',
                  )}
                >
                  <Icon size={18} className={isActive ? color : ''} />
                  {t(labelKey)}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"
                    />
                  )}
                  {to === '/admin' && pendingCount > 0 && !isActive && (
                    <span className="ml-auto bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </motion.div>
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom: language selector + sign out */}
        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          <div className="px-1">
            <LanguageSelector />
          </div>
          <motion.button
            onClick={handleLogout}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={18} />
            {t('nav.signOut')}
          </motion.button>
        </div>
      </motion.aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between gap-4 px-4 py-3 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <Logo size="sm" />
          </div>
          <LanguageSelector />
        </div>

        {/* Page */}
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
