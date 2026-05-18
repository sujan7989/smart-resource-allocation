import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, AreaChart, Area,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import toast from 'react-hot-toast'
import { TrendingUp, Users, CheckSquare, Heart, Star, Download, Award } from 'lucide-react'

interface ImpactData {
  total_volunteer_hours: number
  resolved_needs: number
  completed_tasks: number
  people_helped: number
  top_volunteers: {
    name: string
    tasks_completed: number
    hours_contributed: number
    rating: number
  }[]
  monthly_resolved: {
    month: string
    year: number
    resolved: number
  }[]
}

interface TopVolunteer {
  id: string
  full_name: string
  email: string
  location?: string
  profile?: {
    total_tasks_completed: number
    rating: number
    skills?: string
    experience_years: number
    total_hours_contributed: number
  }
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-slate-400 text-xs mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-white font-bold text-sm">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function ImpactPage() {
  const { t } = useTranslation()
  const [impact, setImpact] = useState<ImpactData | null>(null)
  const [topVolunteers, setTopVolunteers] = useState<TopVolunteer[]>([])
  const [byCategory, setByCategory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/impact'),
      api.get('/volunteers/'),   // fetch all volunteers — no filter param needed
      api.get('/dashboard/needs-by-category'),
    ])
      .then(([impactRes, volRes, catRes]) => {
        setImpact(impactRes.data)
        const sorted = [...volRes.data]
          .filter((v: TopVolunteer) => v.profile && v.profile.total_tasks_completed > 0)
          .sort((a: TopVolunteer, b: TopVolunteer) =>
            (b.profile?.total_tasks_completed ?? 0) - (a.profile?.total_tasks_completed ?? 0)
          )
          .slice(0, 10)
        setTopVolunteers(sorted)
        setByCategory(catRes.data.map((d: any) => ({
          ...d,
          category: d.category.replace('_', ' '),
        })))
      })
      .catch(() => toast.error('Failed to load impact data'))
      .finally(() => setLoading(false))
  }, [])

  const exportCSV = () => {
    if (!impact) return
    const rows: (string | number)[][] = [
      ['Metric', 'Value'],
      ['Resolved Needs', impact.resolved_needs],
      ['Completed Tasks', impact.completed_tasks],
      ['Total Volunteer Hours', impact.total_volunteer_hours],
      ['People Helped', impact.people_helped],
      [],
      ['Top Volunteers'],
      ['Name', 'Tasks Completed', 'Hours Contributed', 'Rating'],
      ...impact.top_volunteers.map(v => [
        v.name, v.tasks_completed, v.hours_contributed, v.rating,
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `impact-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported!')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
    </div>
  )

  const impactCards = [
    {
      icon: Heart,
      label: t('impact.needsResolved'),
      value: impact?.resolved_needs ?? 0,
      sub: 'needs fully resolved',
      color: 'from-red-500 to-rose-500',
      bg: 'from-red-500/10 to-rose-500/10',
      border: 'border-red-500/20',
    },
    {
      icon: CheckSquare,
      label: t('impact.tasksCompleted'),
      value: impact?.completed_tasks ?? 0,
      sub: 'volunteer tasks done',
      color: 'from-green-500 to-emerald-500',
      bg: 'from-green-500/10 to-emerald-500/10',
      border: 'border-green-500/20',
    },
    {
      icon: Users,
      label: t('impact.totalVolunteerHours'),
      value: impact?.total_volunteer_hours ?? 0,
      sub: 'hours contributed',
      color: 'from-orange-500 to-amber-500',
      bg: 'from-orange-500/10 to-amber-500/10',
      border: 'border-orange-500/20',
    },
    {
      icon: TrendingUp,
      label: 'People Helped',
      value: impact?.people_helped ?? 0,
      sub: 'from resolved needs',
      color: 'from-purple-500 to-indigo-500',
      bg: 'from-purple-500/10 to-indigo-500/10',
      border: 'border-purple-500/20',
    },
  ]

  // Monthly resolved chart data
  const monthlyData = impact?.monthly_resolved.map(m => ({
    name: `${m.month} ${m.year !== new Date().getFullYear() ? m.year : ''}`.trim(),
    resolved: m.resolved,
  })) ?? []

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {t('impact.title')}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t('impact.subtitle')}</p>
        </div>
        <motion.button
          onClick={exportCSV}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Download size={15} /> {t('impact.exportCSV')}
        </motion.button>
      </motion.div>

      {/* Impact stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {impactCards.map(card => (
          <motion.div
            key={card.label}
            variants={item}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`relative overflow-hidden rounded-2xl border ${card.border} bg-gradient-to-br ${card.bg} p-5 shadow-xl`}
          >
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.color} opacity-10 blur-2xl`} />
            <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${card.color} shadow-lg mb-3`}>
              <card.icon size={18} className="text-white" />
            </div>
            <p className="text-3xl font-bold text-white stat-number">{card.value.toLocaleString()}</p>
            <p className="text-sm font-semibold text-white/80 mt-0.5">{card.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly resolved needs */}
        <motion.div variants={item} className="card">
          <h2 className="font-semibold text-white mb-1">Needs Resolved per Month</h2>
          <p className="text-xs text-slate-500 mb-4">Last 6 months of resolved community needs</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#resolvedGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Needs by category */}
        <motion.div variants={item} className="card">
          <h2 className="font-semibold text-white mb-1">Needs by Category</h2>
          <p className="text-xs text-slate-500 mb-4">People affected per category</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_affected" name="Affected" radius={[0, 4, 4, 0]}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={`hsl(${200 + i * 25}, 75%, 55%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Top volunteers leaderboard */}
      <motion.div variants={item} className="card">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <Award size={18} className="text-yellow-400" />
          {t('impact.topVolunteers')}
        </h2>
        <p className="text-xs text-slate-500 mb-5">Ranked by tasks completed</p>

        {topVolunteers.length === 0 ? (
          <p className="text-sm text-slate-500">{t('impact.noData')}</p>
        ) : (
          <div className="space-y-3">
            {topVolunteers.map((vol, i) => (
              <motion.div
                key={vol.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-white/10 transition-all"
              >
                {/* Rank medal */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  i === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                  i === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            'bg-slate-800 text-slate-500 border border-white/5'
                }`}>
                  {i + 1}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0">
                  {vol.full_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{vol.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {vol.location ?? vol.email}
                    {vol.profile?.skills && (
                      <span className="ml-2 text-slate-600">
                        · {vol.profile.skills.split(',').slice(0, 2).map(s => s.trim()).join(', ')}
                      </span>
                    )}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-sm font-bold text-white">{vol.profile?.total_tasks_completed ?? 0}</p>
                    <p className="text-xs text-slate-500">tasks</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-400">{vol.profile?.total_hours_contributed ?? 0}h</p>
                    <p className="text-xs text-slate-500">hours</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-yellow-400 flex items-center gap-1">
                      <Star size={12} /> {(vol.profile?.rating ?? 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-500">rating</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
