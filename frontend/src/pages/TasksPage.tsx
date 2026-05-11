import { useEffect, useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Plus, Loader2, Star, MapPin, Calendar } from 'lucide-react'

interface Task {
  id: string; title: string; description: string; community_need_id: string
  required_skills?: string; required_volunteers: number; status: string
  area: string; city: string; deadline?: string; created_at: string
}

interface RecommendedTask {
  task: Task; match_score: number
}

export default function TasksPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const isVolunteer = user?.role === 'volunteer'
  const [tasks, setTasks] = useState<Task[]>([])
  const [recommended, setRecommended] = useState<RecommendedTask[]>([])
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
      const [tasksRes, needsRes] = await Promise.all([
        api.get('/tasks/'),
        api.get('/needs/')
      ])
      setTasks(tasksRes.data)
      setNeeds(needsRes.data)

      if (isVolunteer) {
        const recRes = await api.get('/volunteers/me/recommended-tasks')
        setRecommended(recRes.data)
      }
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...form, deadline: form.deadline || undefined }
      await api.post('/tasks/', payload)
      toast.success('Task created!')
      setShowForm(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccept = async (taskId: string) => {
    try {
      await api.post('/assignments/', { task_id: taskId, volunteer_id: user!.id })
      toast.success('You have been assigned to this task!')
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to accept task')
    }
  }

  const displayTasks = tab === 'recommended' ? recommended.map(r => r.task) : tasks

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">Volunteer tasks linked to community needs</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Create Task
          </button>
        )}
      </div>

      {/* Tabs for volunteers */}
      {isVolunteer && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button onClick={() => setTab('all')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>All Tasks</button>
          <button onClick={() => setTab('recommended')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${tab === 'recommended' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            <Star size={14} /> Recommended ({recommended.length})
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && isAdmin && (
        <div className="card border-primary-200">
          <h2 className="font-semibold text-gray-800 mb-4">New Task</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Linked Community Need</label>
              <select className="input" value={form.community_need_id} onChange={e => setForm(f => ({...f, community_need_id: e.target.value}))} required>
                <option value="">Select a need...</option>
                {needs.map(n => <option key={n.id} value={n.id}>{n.title} ({n.city})</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input h-20 resize-none" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills (comma-separated)</label>
              <input className="input" placeholder="medical, first aid" value={form.required_skills} onChange={e => setForm(f => ({...f, required_skills: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volunteers Needed</label>
              <input type="number" className="input" min={1} value={form.required_volunteers} onChange={e => setForm(f => ({...f, required_volunteers: +e.target.value}))} />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (optional)</label>
              <input type="datetime-local" className="input" value={form.deadline} onChange={e => setForm(f => ({...f, deadline: e.target.value}))} />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
                {submitting && <Loader2 size={14} className="animate-spin" />} Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="grid gap-4">
          {tab === 'recommended' ? recommended.map(({ task, match_score }) => (
            <TaskCard key={task.id} task={task} matchScore={match_score} isVolunteer={isVolunteer} onAccept={handleAccept} />
          )) : tasks.map(task => (
            <TaskCard key={task.id} task={task} isVolunteer={isVolunteer} onAccept={handleAccept} />
          ))}
          {displayTasks.length === 0 && (
            <div className="card text-center py-12 text-gray-400">
              {tab === 'recommended' ? 'No recommended tasks. Complete your volunteer profile first.' : 'No tasks found'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, matchScore, isVolunteer, onAccept }: {
  task: Task; matchScore?: number; isVolunteer?: boolean; onAccept: (id: string) => void
}) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-gray-900">{task.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              task.status === 'open' ? 'bg-blue-100 text-blue-700' :
              task.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
              task.status === 'completed' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-600'
            }`}>{task.status}</span>
            {matchScore !== undefined && (
              <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star size={10} /> {matchScore}% match
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><MapPin size={12} />{task.area}, {task.city}</span>
            <span>{task.required_volunteers} volunteer{task.required_volunteers > 1 ? 's' : ''} needed</span>
            {task.required_skills && <span>Skills: {task.required_skills}</span>}
            {task.deadline && <span className="flex items-center gap-1"><Calendar size={12} />Due {new Date(task.deadline).toLocaleDateString()}</span>}
          </div>
        </div>
        {isVolunteer && task.status === 'open' && (
          <button onClick={() => onAccept(task.id)} className="btn-primary text-sm shrink-0">Accept</button>
        )}
      </div>
    </div>
  )
}
