import { useEffect, useState } from 'react'
import api from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { AlertTriangle, Users, CheckSquare, FileText, TrendingUp, MapPin } from 'lucide-react'

const URGENCY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#06b6d4', '#f59e0b', '#ef4444']

interface Stats {
  needs: { total: number; open: number; critical: number; total_affected_people: number }
  volunteers: { total: number; available: number }
  tasks: { total: number; open: number; completed: number }
  assignments: { total: number; active: number }
  field_reports: { pending_review: number }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [byCategory, setByCategory] = useState<any[]>([])
  const [byUrgency, setByUrgency] = useState<any[]>([])
  const [byCity, setByCity] = useState<any[]>([])
  const [topNeeds, setTopNeeds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/needs-by-category'),
      api.get('/dashboard/needs-by-urgency'),
      api.get('/dashboard/needs-by-city'),
      api.get('/dashboard/top-urgent-needs'),
    ]).then(([s, cat, urg, city, top]) => {
      setStats(s.data)
      setByCategory(cat.data)
      setByUrgency(urg.data)
      setByCity(city.data)
      setTopNeeds(top.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time overview of community needs and volunteer coordination</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<AlertTriangle className="text-red-500" />} label="Open Needs" value={stats?.needs.open ?? 0} sub={`${stats?.needs.critical ?? 0} critical`} color="red" />
        <StatCard icon={<Users className="text-blue-500" />} label="Volunteers" value={stats?.volunteers.available ?? 0} sub={`of ${stats?.volunteers.total} available`} color="blue" />
        <StatCard icon={<CheckSquare className="text-green-500" />} label="Open Tasks" value={stats?.tasks.open ?? 0} sub={`${stats?.tasks.completed} completed`} color="green" />
        <StatCard icon={<TrendingUp className="text-purple-500" />} label="People Affected" value={(stats?.needs.total_affected_people ?? 0).toLocaleString()} sub="across all needs" color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs by Category */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Needs by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Needs by Urgency */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Needs by Urgency</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byUrgency} dataKey="count" nameKey="urgency" cx="50%" cy="50%" outerRadius={80} label={({ urgency, count }) => `${urgency}: ${count}`}>
                {byUrgency.map((entry, i) => (
                  <Cell key={i} fill={URGENCY_COLORS[entry.urgency] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top cities + Top urgent needs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top cities */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-primary-500" /> Top Cities by Open Needs
          </h2>
          <div className="space-y-3">
            {byCity.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{c.city}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${Math.min((c.count / (byCity[0]?.count || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{c.count}</span>
                </div>
              </div>
            ))}
            {byCity.length === 0 && <p className="text-sm text-gray-400">No data yet</p>}
          </div>
        </div>

        {/* Top urgent needs */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Most Urgent Needs
          </h2>
          <div className="space-y-3">
            {topNeeds.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                  <p className="text-xs text-gray-500">{n.city} · {n.affected_people} affected</p>
                </div>
                <span className={`badge-${n.urgency} shrink-0`}>{n.urgency}</span>
              </div>
            ))}
            {topNeeds.length === 0 && <p className="text-sm text-gray-400">No urgent needs</p>}
          </div>
        </div>
      </div>

      {/* Field reports pending */}
      {(stats?.field_reports.pending_review ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <FileText className="text-amber-500 shrink-0" size={20} />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{stats?.field_reports.pending_review} field reports</span> are pending admin review.
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; color: string
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-2 rounded-lg bg-${color}-50`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  )
}
