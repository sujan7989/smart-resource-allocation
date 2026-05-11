import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Plus, Loader2, Star, MapPin, Calendar, CheckSquare, X, Zap } from 'lucide-react'

interface Task {
  id: string; title: string; description: string; community_need_id: string
  required_skills?: string; required_volunteers: number; status: string
  area: string; city: string; deadline?: string; created_at: string
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const statusStyles: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  assigned: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  in_progress: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-slate-700 text-slate-400 border-slate-600',
}

export default function TasksPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const isVolunteer = user?.role === 'volunteer'
  const [tasks, setTasks] = useState<Task[]>([])
  const [recommended, setRecommended] = useState<{ task: Task; match_score: number }[]>([])
  const [needs, setNeeds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    community_need_id: '', title: '', description: '',
    required_skills: '', required_volunteers: 1, area: '', city: '', deadline: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'all' | 'recommended'>('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tasksRes, needsRes] = await Promise.all([api.get('/tasks/'), api.get('/needs/')])
      setTasks(tasksRes.data)
      setNeeds(needsRes.data)
      if (isVolunteer) {
        try {
          const recRes = await api.get('/volunteers/me/recommended-tasks')
          setRecommended(recRes.data)
        } catch {}
      }
    } catch { toast.error('Failed to load tasks') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/tasks/', { ...form, deadline: form.deadline || undefined })
      toast.success('Task created!')
      setShowForm(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSubmitting(false) }
  }

  const handleAccept = async (taskId: string) => {
    try {
      await api.post('/assignments/', { task_id: taskId, volunteer_id: user!.id })
      toast.success('Task accepted! You are now assigned.')
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to accept task')
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Tasks</h1>
          <p className="text-slate-400 text-sm mt-1">Volunteer tasks linked to community needs</p>
        </div>
        {isAdmin && (
          <motion.button onClick={() => setShowForm(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Create Task
          </motion.button>
        )}
      </motion.div>

      {/* Tabs */}
      {isVolunteer && (
        <motion.div variants={item} className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit border border-white/5">
          {[
            { key: 'all', label: 'All Tasks', icon: CheckSquare },
            { key: 'recommended', label: `Recommended (${recommended.length})`, icon: Star },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
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
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="input-label">Linked Community Need</label>
                <select className="input bg-slate-800/80" value={form.community_need_id} onChange={e => setForm(f => ({...f, community_need_id: e.target.value}))} required>
                  <option value="">Select a need...</option>
                  {needs.map(n => <option key={n.id} value={n.id} className="bg-slate-800">{n.title} ({n.city})</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="input-label">Task Title</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required placeholder="e.g. Medical Camp Setup" />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">Description</label>
                <textarea className="input h-20 resize-none" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required />
              </div>
              <div>
                <label className="input-label">Required Skills (comma-separated)</label>
                <input className="input" placeholder="medical, first aid" value={form.required_skills} onChange={e => setForm(f => ({...f, required_skills: e.target.value}))} />
              </div>
              <div>
                <label className="input-label">Volunteers Needed</label>
                <input type="number" className="input" min={1} value={form.required_volunteers} onChange={e => setForm(f => ({...f, required_volunteers: +e.target.value}))} />
              </div>
              <div>
                <label className="input-label">Area</label>
                <input className="input" value={form.area} onChange={e => setForm(f => ({...f, area: e.target.value}))} required />
              </div>
              <div>
                <label className="input-label">City</label>
                <input className="input" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} required />
              </div>
              <div>
                <label className="input-label">Deadline (optional)</label>
                <input type="datetime-local" className="input" value={form.deadline} onChange={e => setForm(f => ({...f, deadline: e.target.value}))} />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
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
        <motion.div variants={container} className="grid gap-4">
          {(tab === 'recommended' ? recommended.map(r => ({ ...r.task, _score: r.match_score })) : tasks.map(t => ({ ...t, _score: undefined }))).map((task: any) => (
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
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusStyles[task.status] || statusStyles.open}`}>
                      {task.status}
                    </span>
                    {task._score !== undefined && (
                      <span className="flex items-center gap-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <Zap size={10} /> {task._score}% match
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{task.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin size={11} />{task.area}, {task.city}</span>
                    <span>{task.required_volunteers} volunteer{task.required_volunteers > 1 ? 's' : ''} needed</span>
                    {task.required_skills && (
                      <span className="flex gap-1 flex-wrap">
                        {task.required_skills.split(',').map((s: string) => (
                          <span key={s} className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs">{s.trim()}</span>
                        ))}
                      </span>
                    )}
                    {task.deadline && <span className="flex items-center gap-1"><Calendar size={11} />Due {new Date(task.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
                {isVolunteer && task.status === 'open' && (
                  <motion.button
                    onClick={() => handleAccept(task.id)}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="btn-primary text-sm shrink-0"
                  >
                    Accept
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
          {((tab === 'recommended' ? recommended : tasks).length === 0) && (
            <motion.div variants={item} className="card text-center py-16">
              <CheckSquare size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">
                {tab === 'recommended' ? 'No recommended tasks. Complete your volunteer profile first.' : 'No tasks found'}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
