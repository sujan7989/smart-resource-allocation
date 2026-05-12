import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import {
  Plus, Search, MapPin, Users, Loader2, X, CheckCircle,
  AlertTriangle, Trash2, ChevronLeft, ChevronRight, Globe,
} from 'lucide-react'

interface Need {
  id: string
  title: string
  description: string
  category: string
  urgency: string
  status: string
  area: string
  city: string
  country: string
  affected_people: number
  urgency_score: number
  is_verified: boolean
  reported_by_org?: string
  created_at: string
}

const CATEGORIES = [
  'food', 'medical', 'education', 'shelter', 'water',
  'sanitation', 'mental_health', 'elderly_care', 'child_care', 'disaster_relief', 'other',
]
const URGENCIES = ['low', 'medium', 'high', 'critical']
const PAGE_SIZE = 20

const urgencyGradients: Record<string, string> = {
  critical: 'from-red-500/20 to-rose-500/20 border-red-500/30',
  high: 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
  medium: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  low: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function NeedsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [needs, setNeeds] = useState<Need[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', category: 'food', urgency: 'medium',
    area: '', city: '', state: '', country: '', affected_people: 0,
    reported_by_org: '', latitude: '', longitude: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchNeeds = useCallback(async (currentPage = 0) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        skip: currentPage * PAGE_SIZE,
        limit: PAGE_SIZE + 1, // fetch one extra to detect if there's a next page
      }
      if (filterUrgency) params.urgency = filterUrgency
      if (filterCategory) params.category = filterCategory
      if (search) params.search = search

      const { data } = await api.get('/needs/', { params })
      const hasNext = data.length > PAGE_SIZE
      setNeeds(hasNext ? data.slice(0, PAGE_SIZE) : data)
      setHasMore(hasNext)
    } catch {
      toast.error('Failed to load needs')
    } finally {
      setLoading(false)
    }
  }, [filterUrgency, filterCategory, search])

  useEffect(() => {
    setPage(0)
    fetchNeeds(0)
  }, [filterUrgency, filterCategory, search])

  // Only run on explicit page changes (not on filter changes — those reset to page 0 above)
  useEffect(() => {
    if (page > 0) fetchNeeds(page)
  }, [page, fetchNeeds])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/needs/', {
        ...form,
        state: form.state || undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      })
      toast.success('Community need created!')
      setShowForm(false)
      setForm({
        title: '', description: '', category: 'food', urgency: 'medium',
        area: '', city: '', state: '', country: '', affected_people: 0,
        reported_by_org: '', latitude: '', longitude: '',
      })
      fetchNeeds(0)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to create need')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This will also delete all linked tasks and assignments.`)) return
    setDeletingId(id)
    try {
      await api.delete(`/needs/${id}`)
      toast.success('Need deleted')
      fetchNeeds(page)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleVerify = async (id: string) => {
    try {
      await api.patch(`/needs/${id}`, { is_verified: true })
      toast.success('Need verified')
      fetchNeeds(page)
    } catch {
      toast.error('Failed to verify')
    }
  }

  const handleResolve = async (id: string) => {
    try {
      await api.patch(`/needs/${id}`, { status: 'resolved' })
      toast.success('Need marked as resolved')
      fetchNeeds(page)
    } catch {
      toast.error('Failed to resolve')
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Community Needs
          </h1>
          <p className="text-slate-400 text-sm mt-1">Prioritized list of urgent community needs worldwide</p>
        </div>
        {isAdmin && (
          <motion.button
            onClick={() => setShowForm(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Add Need
          </motion.button>
        )}
      </motion.div>

      {/* Filters — server-side search */}
      <motion.div variants={item} className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-11"
            placeholder="Search by title, city, or description..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <select
          className="input w-44 bg-slate-800/80"
          value={filterUrgency}
          onChange={e => setFilterUrgency(e.target.value)}
        >
          <option value="">All urgencies</option>
          {URGENCIES.map(u => (
            <option key={u} value={u} className="bg-slate-800 capitalize">{u}</option>
          ))}
        </select>
        <select
          className="input w-44 bg-slate-800/80"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c} className="bg-slate-800 capitalize">{c.replace('_', ' ')}</option>
          ))}
        </select>
      </motion.div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            className="card border-blue-500/20 glow-blue"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">New Community Need</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-500 hover:text-white transition-colors"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="input-label">Title</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  minLength={5}
                  maxLength={200}
                  placeholder="e.g. Emergency Medical Aid — Flood Victims"
                />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">Description</label>
                <textarea
                  className="input h-20 resize-none"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required
                  minLength={10}
                  placeholder="Describe the community need in detail..."
                />
              </div>
              <div>
                <label className="input-label">Category</label>
                <select
                  className="input bg-slate-800/80"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c} className="bg-slate-800 capitalize">
                      {c.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Urgency Level</label>
                <select
                  className="input bg-slate-800/80"
                  value={form.urgency}
                  onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
                >
                  {URGENCIES.map(u => (
                    <option key={u} value={u} className="bg-slate-800 capitalize">{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Area / Locality</label>
                <input
                  className="input"
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  required
                  placeholder="e.g. Downtown, Dharavi"
                />
              </div>
              <div>
                <label className="input-label">City</label>
                <input
                  className="input"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  required
                  placeholder="e.g. Mumbai, Lagos, São Paulo"
                />
              </div>
              <div>
                <label className="input-label">Country</label>
                <div className="relative">
                  <Globe size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    className="input pl-11"
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    required
                    placeholder="e.g. India, Nigeria, Brazil"
                  />
                </div>
              </div>
              <div>
                <label className="input-label">Affected People</label>
                <input
                  type="number"
                  className="input"
                  value={form.affected_people}
                  onChange={e => setForm(f => ({ ...f, affected_people: +e.target.value }))}
                  min={0}
                />
              </div>
              <div>
                <label className="input-label">Reporting Organization <span className="text-slate-600">(optional)</span></label>
                <input
                  className="input"
                  value={form.reported_by_org}
                  onChange={e => setForm(f => ({ ...f, reported_by_org: e.target.value }))}
                  placeholder="NGO name"
                />
              </div>
              <div>
                <label className="input-label">Latitude <span className="text-slate-600">(optional — for map)</span></label>
                <input
                  type="number"
                  step="any"
                  className="input"
                  value={form.latitude}
                  onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                  placeholder="e.g. 19.076"
                  min={-90}
                  max={90}
                />
              </div>
              <div>
                <label className="input-label">Longitude <span className="text-slate-600">(optional — for map)</span></label>
                <input
                  type="number"
                  step="any"
                  className="input"
                  value={form.longitude}
                  onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                  placeholder="e.g. 72.877"
                  min={-180}
                  max={180}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
                  {submitting && <Loader2 size={14} className="animate-spin" />} Create Need
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Needs list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          <motion.div variants={container} className="grid gap-4">
            {needs.map(need => (
              <motion.div
                key={need.id}
                variants={item}
                whileHover={{ y: -2 }}
                className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${
                  urgencyGradients[need.urgency] || 'from-slate-800/50 to-slate-800/50 border-white/10'
                } p-5 transition-all duration-300`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-white">{need.title}</h3>
                      <span className={`badge-${need.urgency}`}>{need.urgency}</span>
                      {need.is_verified && (
                        <span className="flex items-center gap-1 bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-semibold px-2 py-0.5 rounded-full">
                          <CheckCircle size={10} /> Verified
                        </span>
                      )}
                      <span className="bg-white/10 text-slate-300 text-xs px-2 py-0.5 rounded-full capitalize">
                        {need.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2">{need.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />{need.area}, {need.city}
                        {need.country && `, ${need.country}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} />{need.affected_people.toLocaleString()} affected
                      </span>
                      {need.reported_by_org && <span>by {need.reported_by_org}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium border ${
                      need.status === 'open'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : need.status === 'in_progress'
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        : 'bg-slate-700 text-slate-400 border-slate-600'
                    }`}>
                      {need.status.replace('_', ' ')}
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        {need.status === 'open' && !need.is_verified && (
                          <button
                            onClick={() => handleVerify(need.id)}
                            className="text-xs text-green-400 hover:text-green-300 transition-colors"
                          >
                            Verify
                          </button>
                        )}
                        {need.status === 'open' && (
                          <button
                            onClick={() => handleResolve(need.id)}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(need.id, need.title)}
                          disabled={deletingId === need.id}
                          className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-50"
                          aria-label="Delete need"
                        >
                          {deletingId === need.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Trash2 size={14} />
                          }
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {needs.length === 0 && (
              <motion.div variants={item} className="card text-center py-16">
                <AlertTriangle size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">No community needs found</p>
                {(search || filterUrgency || filterCategory) && (
                  <button
                    onClick={() => { setSearchInput(''); setSearch(''); setFilterUrgency(''); setFilterCategory('') }}
                    className="text-blue-400 text-sm mt-2 hover:text-blue-300 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Pagination */}
          {(page > 0 || hasMore) && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-secondary flex items-center gap-1 py-2 px-4 disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-sm text-slate-400">Page {page + 1}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="btn-secondary flex items-center gap-1 py-2 px-4 disabled:opacity-40"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
