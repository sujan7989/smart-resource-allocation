import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import {
  Plus, Loader2, Star, MapPin, Calendar, CheckSquare, X,
  Zap, Search, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  community_need_id: string
  required_skills?: string
  required_volunteers: number
  status: string
  area: string
  city: string
  deadline?: string
  created_at: string
}

const PAGE_SIZE = 20

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const statusStyles: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  assigned: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  in_progress: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-slate-700 text-slate-400 border-slate-600',
}

const TASK_STATUSES = ['open', 'assigned', 'in_progress', 'completed', 'cancelled']

export default function TasksPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const isVolunteer = user?.role === 'volunteer'

  const [tasks, setTasks] = useState<Task[]>([])
  const [recommended, setRecommended] = useState<{ task: Task; match_score: number }[]>([])
  const [needs, setNeeds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'all' | 'recommended'>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const [form, setForm] = useState({
    community_need_id: '', title: '', description: '',
    required_skills: '', required_volunteers: 1, area: '', city: '', deadline: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchTasks = useCallback(async (currentPage = 0) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        skip: currentPage * PAGE_SIZE,
        limit: PAGE_SIZE + 1,
      }
      if (filterStatus) params.status = filterStatus
      if (search) params.city = search

      const tasksRes = await api.get('/tasks/', { params })
      const hasNext = tasksRes.data.length > PAGE_SIZE
      setTasks(hasNext ? tasksRes.data.slice(0, PAGE_SIZE) : tasksRes.data)
      setHasMore(hasNext)

      if (isVolunteer) {
        try {
          const recRes = await api.get('/volunteers/me/recommended-tasks')
          setRecommended(recRes.data)
        } catch {
          // Profile may not exist yet — silently ignore
        }
      }
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, search, isVolunteer])

  // Fetch needs dropdown once on mount — not on every task refresh
  useEffect(() => {
    api.get('/needs/', { params: { limit: 100 } })
      .then(r => setNeeds(r.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setPage(0)
    fetchTasks(0)
  }, [filterStatus, search])

  useEffect(() => {
    if (page > 0) fetchTasks(page)
  }, [page, fetchTasks])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/tasks/', {
        ...form,
        deadline: form.deadline || undefined,
      })
      toast.success('Task created!')
      setShowForm(false)
      setForm({
        community_need_id: '', title: '', description: '',
        required_skills: '', required_volunteers: 1, area: '', city: '', deadline: '',
      })
      fetchTasks(0)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccept = async (taskId: string) => {
    try {
      await api.post('/assignments/', { task_id: taskId, volunteer_id: user!.id })
      toast.success('Task accepted! Pending admin approval.')
      fetchTasks(page)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to accept task')
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete task "${title}"? This will also remove all assignments.`)) return
    setDeletingId(id)
    try {
      await api.delete(`/tasks/${id}`)
      toast.success('Task deleted')
      fetchTasks(page)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const displayTasks =
    tab === 'recommended'
      ? recommended.map(r => ({ ...r.task, _score: r.match_score }))
      : tasks.map(t => ({ ...t, _score: undefined }))

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Tasks</h1>
          <p className="text-slate-400 text-sm mt-1">Volunteer tasks linked to community needs</p>
        </div>
        {isAdmin && (
          <motion.button
            onClick={() => setShowForm(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Create Task
          </motion.button>
        )}
      </motion.div>

      {/* Tabs (volunteers only) */}
      {isVolunteer && (
        <motion.div variants={item} className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit border border-white/5">
          {[
            { key: 'all', label: 'All Tasks', icon: CheckSquare },
            { key: 'recommended', label: `Recommended (${recommended.length})`, icon: Star },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'all' | 'recommended')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === t.key
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Search + filter (only on "all" tab) */}
      {tab === 'all' && (
        <motion.div variants={item} className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input pl-11"
              placeholder="Search by city..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <select
            className="input w-44 bg-slate-800/80"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {TASK_STATUSES.map(s => (
              <option key={s} value={s} className="bg-slate-800 capitalize">
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </motion.div>
      )}

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
              <h2 className="font-bold text-white text-lg">New Task</h2>
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
                <label className="input-label">Linked Community Need</label>
                <select
                  className="input bg-slate-800/80"
                  value={form.community_need_id}
                  onChange={e => setForm(f => ({ ...f, community_need_id: e.target.value }))}
                  required
                >
                  <option value="">Select a need...</option>
                  {needs.map(n => (
                    <option key={n.id} value={n.id} className="bg-slate-800">
                      {n.title} ({n.city})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="input-label">Task Title</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="e.g. Medical Camp Setup"
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
                />
              </div>
              <div>
                <label className="input-label">Required Skills <span className="text-slate-600">(comma-separated)</span></label>
                <input
                  className="input"
                  placeholder="medical, first aid"
                  value={form.required_skills}
                  onChange={e => setForm(f => ({ ...f, required_skills: e.target.value }))}
                />
              </div>
              <div>
                <label className="input-label">Volunteers Needed</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={1000}
                  value={form.required_volunteers}
                  onChange={e => setForm(f => ({ ...f, required_volunteers: +e.target.value }))}
                />
              </div>
              <div>
                <label className="input-label">Area</label>
                <input
                  className="input"
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="input-label">City</label>
                <input
                  className="input"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="input-label">Deadline <span className="text-slate-600">(optional)</span></label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
                  {submitting && <Loader2 size={14} className="animate-spin" />} Create Task
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          <motion.div variants={container} className="grid gap-4">
            {(displayTasks as any[]).map((task: any) => (
              <motion.div
                key={task.id}
                variants={item}
                whileHover={{ y: -2 }}
                className="card hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-white">{task.title}</h3>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                        statusStyles[task.status] || statusStyles.open
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {task._score !== undefined && (
                        <span className="flex items-center gap-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <Zap size={10} /> {task._score}% match
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />{task.area}, {task.city}
                      </span>
                      <span>{task.required_volunteers} volunteer{task.required_volunteers > 1 ? 's' : ''} needed</span>
                      {task.required_skills && (
                        <span className="flex gap-1 flex-wrap">
                          {task.required_skills.split(',').map((s: string) => (
                            <span key={s} className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                              {s.trim()}
                            </span>
                          ))}
                        </span>
                      )}
                      {task.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />Due {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isVolunteer && task.status === 'open' && (
                      <motion.button
                        onClick={() => handleAccept(task.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-primary text-sm"
                      >
                        Accept
                      </motion.button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(task.id, task.title)}
                        disabled={deletingId === task.id}
                        className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-50"
                        aria-label="Delete task"
                      >
                        {deletingId === task.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {displayTasks.length === 0 && (
              <motion.div variants={item} className="card text-center py-16">
                <CheckSquare size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">
                  {tab === 'recommended'
                    ? 'No recommended tasks. Complete your volunteer profile first.'
                    : 'No tasks found'}
                </p>
                {tab === 'all' && (search || filterStatus) && (
                  <button
                    onClick={() => { setSearchInput(''); setSearch(''); setFilterStatus('') }}
                    className="text-blue-400 text-sm mt-2 hover:text-blue-300 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Pagination (all tab only) */}
          {tab === 'all' && (page > 0 || hasMore) && (
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
