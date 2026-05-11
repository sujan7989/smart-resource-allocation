import { useEffect, useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Plus, Search, Filter, MapPin, Users, Loader2 } from 'lucide-react'

interface Need {
  id: string; title: string; description: string; category: string
  urgency: string; status: string; area: string; city: string
  affected_people: number; urgency_score: number; is_verified: boolean
  reported_by_org?: string; created_at: string
}

const CATEGORIES = ['food','medical','education','shelter','water','sanitation','mental_health','elderly_care','child_care','disaster_relief','other']
const URGENCIES = ['low','medium','high','critical']

export default function NeedsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [needs, setNeeds] = useState<Need[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', category: 'food', urgency: 'medium',
    area: '', city: '', state: '', country: 'India', affected_people: 0, reported_by_org: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchNeeds = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterUrgency) params.urgency = filterUrgency
      const { data } = await api.get('/needs/', { params })
      setNeeds(data)
    } catch {
      toast.error('Failed to load needs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNeeds() }, [filterUrgency])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/needs/', form)
      toast.success('Community need created!')
      setShowForm(false)
      fetchNeeds()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create need')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = needs.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Needs</h1>
          <p className="text-gray-500 text-sm mt-1">Prioritized list of community needs requiring volunteer support</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Need
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by title or city..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
          <option value="">All urgencies</option>
          {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Create form */}
      {showForm && isAdmin && (
        <div className="card border-primary-200">
          <h2 className="font-semibold text-gray-800 mb-4">New Community Need</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input h-20 resize-none" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select className="input" value={form.urgency} onChange={e => setForm(f => ({...f, urgency: e.target.value}))}>
                {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
              <input className="input" value={form.area} onChange={e => setForm(f => ({...f, area: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input className="input" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affected People</label>
              <input type="number" className="input" value={form.affected_people} onChange={e => setForm(f => ({...f, affected_people: +e.target.value}))} min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Organization</label>
              <input className="input" value={form.reported_by_org} onChange={e => setForm(f => ({...f, reported_by_org: e.target.value}))} />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
                {submitting && <Loader2 size={14} className="animate-spin" />} Create Need
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Needs list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(need => (
            <NeedCard key={need.id} need={need} isAdmin={isAdmin} onRefresh={fetchNeeds} />
          ))}
          {filtered.length === 0 && (
            <div className="card text-center py-12 text-gray-400">No community needs found</div>
          )}
        </div>
      )}
    </div>
  )
}

function NeedCard({ need, isAdmin, onRefresh }: { need: Need; isAdmin: boolean; onRefresh: () => void }) {
  const handleVerify = async () => {
    try {
      await api.patch(`/needs/${need.id}`, { is_verified: true })
      toast.success('Need verified')
      onRefresh()
    } catch {
      toast.error('Failed to verify')
    }
  }

  const handleClose = async () => {
    try {
      await api.patch(`/needs/${need.id}`, { status: 'resolved' })
      toast.success('Need marked as resolved')
      onRefresh()
    } catch {
      toast.error('Failed to update')
    }
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-gray-900">{need.title}</h3>
            <span className={`badge-${need.urgency}`}>{need.urgency}</span>
            {need.is_verified && <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">✓ Verified</span>}
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">{need.category.replace('_', ' ')}</span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{need.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><MapPin size={12} />{need.area}, {need.city}</span>
            <span className="flex items-center gap-1"><Users size={12} />{need.affected_people} affected</span>
            {need.reported_by_org && <span>by {need.reported_by_org}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            need.status === 'open' ? 'bg-blue-100 text-blue-700' :
            need.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>{need.status.replace('_', ' ')}</span>
          {isAdmin && need.status === 'open' && (
            <div className="flex gap-2">
              {!need.is_verified && (
                <button onClick={handleVerify} className="text-xs text-green-600 hover:underline">Verify</button>
              )}
              <button onClick={handleClose} className="text-xs text-gray-500 hover:underline">Resolve</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
