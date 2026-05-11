import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import api from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { AlertTriangle, Users, CheckSquare, TrendingUp, MapPin, Bell, FileText, Activity } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'

const URGENCY_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e',
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(false)
  useEffect(() => {
    if (ref.current) return
    ref.current = true
    const duration = 1200
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])
  return <span className="stat-number">{display.toLocaleString()}</span>
}

interface Stats {
  needs: { total: number; open: number; critical: number; total_affected_people: number }
  volunteers: { total: number; available: number }
  tasks: { total: number; open: number; completed: number }
  assignments: { total: number; active: number }
  field_reports: { pending_review: number }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-slate-400 text-xs mb-1">{label}</p>
        <p className="text-white font-bold">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [byCategory, setByCategory] = useState<any[]>([])
  const [byUrgency, setByUrgency] = useState<any[]>([])
  const [byCity, setByCity] = useState<any[]>([])
  const [topNeeds, setTopNeeds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { permission, supported, requestPermission, sendLocalNotification } = usePushNotifications()

  const handleEnableNotifications = async () => {
    const granted = await requestPermission()
    if (granted) {
      sendLocalNotification('Notifications Enabled ✅', 'You will now receive alerts for critical needs.')
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/needs-by-category'),
      api.get('/dashboard/needs-by-urgency'),
      api.get('/dashboard/needs-by-city'),
      api.get('/dashboard/top-urgent-needs'),
    ]).then(([s, cat, urg, city, top]) => {
      setStats(s.data)
      setByCategory(cat.data.map((d: any) => ({ ...d, category: d.category.replace('_', ' ') })))
      setByUrgency(urg.data)
      setByCity(city.data)
      setTopNeeds(top.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
      </div>
    </div>
  )

  const statCards = [
    {
      icon: AlertTriangle, label: 'Open Needs', value: stats?.needs.open ?? 0,
      sub: `${stats?.needs.critical ?? 0} critical`, color: 'from-red-500 to-orange-500',
      bg: 'from-red-500/10 to-orange-500/10', border: 'border-red-500/20', glow: 'shadow-red-500/10'
    },
    {
      icon: Users, label: 'Available Volunteers', value: stats?.volunteers.available ?? 0,
      sub: `of ${stats?.volunteers.total} total`, color: 'from-blue-500 to-cyan-500',
      bg: 'from-blue-500/10 to-cyan-500/10', border: 'border-blue-500/20', glow: 'shadow-blue-500/10'
    },
    {
      icon: CheckSquare, label: 'Open Tasks', value: stats?.tasks.open ?? 0,
      sub: `${stats?.tasks.completed} completed`, color: 'from-green-500 to-emerald-500',
      bg: 'from-green-500/10 to-emerald-500/10', border: 'border-green-500/20', glow: 'shadow-green-500/10'
    },
    {
      icon: TrendingUp, label: 'People Affected', value: stats?.needs.total_affected_people ?? 0,
      sub: 'across all needs', color: 'from-purple-500 to-indigo-500',
      bg: 'from-purple-500/10 to-indigo-500/10', border: 'border-purple-500/20', glow: 'shadow-purple-500/10'
    },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            <Activity size={14} className="text-green-400 animate-pulse" />
            Live overview · Updated just now
          </p>
        </div>
        {supported && permission === 'default' && (
          <motion.button
            onClick={handleEnableNotifications}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-500/20 transition-all"
          >
            <Bell size={15} /> Enable Alerts
          </motion.button>
        )}
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            variants={item}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`relative overflow-hidden rounded-2xl border ${card.border} bg-gradient-to-br ${card.bg} p-5 shadow-xl ${card.glow} cursor-default`}
          >
            {/* Background glow */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.color} opacity-10 blur-2xl`} />

            <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${card.color} shadow-lg mb-3`}>
              <card.icon size={18} className="text-white" />
            </div>
            <p className="text-3xl font-bold text-white">
              <AnimatedNumber value={card.value} />
            </p>
            <p className="text-sm font-semibold text-white/80 mt-0.5">{card.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs by Category */}
        <motion.div variants={item} className="card">
          <h2 className="font-semibold text-white mb-1">Needs by Category</h2>
          <p className="text-xs text-slate-500 mb-4">Distribution across all categories</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={`hsl(${220 + i * 30}, 80%, 60%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Needs by Urgency */}
        <motion.div variants={item} className="card">
          <h2 className="font-semibold text-white mb-1">Urgency Breakdown</h2>
          <p className="text-xs text-slate-500 mb-4">Priority levels across all needs</p>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie data={byUrgency} dataKey="count" nameKey="urgency" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {byUrgency.map((entry, i) => (
                    <Cell key={i} fill={URGENCY_COLORS[entry.urgency] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {byUrgency.map(u => (
                <div key={u.urgency} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: URGENCY_COLORS[u.urgency] }} />
                  <span className="text-xs text-slate-400 capitalize flex-1">{u.urgency}</span>
                  <span className="text-xs font-bold text-white">{u.count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top cities */}
        <motion.div variants={item} className="card">
          <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
            <MapPin size={16} className="text-blue-400" /> Top Cities by Need
          </h2>
          <p className="text-xs text-slate-500 mb-4">Cities with most open community needs</p>
          <div className="space-y-3">
            {byCity.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-center gap-3"
              >
                <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                <span className="text-sm text-white flex-1">{c.city}</span>
                <div className="w-28 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((c.count / (byCity[0]?.count || 1)) * 100, 100)}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  />
                </div>
                <span className="text-xs text-slate-400 w-4 text-right">{c.count}</span>
              </motion.div>
            ))}
            {byCity.length === 0 && <p className="text-sm text-slate-500">No data yet</p>}
          </div>
        </motion.div>

        {/* Top urgent needs */}
        <motion.div variants={item} className="card">
          <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" /> Most Urgent Needs
          </h2>
          <p className="text-xs text-slate-500 mb-4">Highest priority open needs right now</p>
          <div className="space-y-3">
            {topNeeds.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.city} · {n.affected_people.toLocaleString()} affected</p>
                </div>
                <span className={`badge-${n.urgency} shrink-0`}>{n.urgency}</span>
              </motion.div>
            ))}
            {topNeeds.length === 0 && <p className="text-sm text-slate-500">No urgent needs</p>}
          </div>
        </motion.div>
      </div>

      {/* Pending reports alert */}
      {(stats?.field_reports.pending_review ?? 0) > 0 && (
        <motion.div
          variants={item}
          className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"
        >
          <div className="p-2 rounded-xl bg-amber-500/20">
            <FileText size={18} className="text-amber-400" />
          </div>
          <p className="text-sm text-amber-300">
            <span className="font-semibold">{stats?.field_reports.pending_review} field reports</span>
            {' '}are pending admin review
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
