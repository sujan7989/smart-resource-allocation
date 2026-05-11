import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Loader2, User, CheckCircle, Star, MapPin, Phone, Mail, Award } from 'lucide-react'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const roleGradients: Record<string, string> = {
  admin: 'from-purple-500 to-indigo-600',
  volunteer: 'from-blue-500 to-cyan-600',
  field_worker: 'from-green-500 to-emerald-600',
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const isVolunteer = user?.role === 'volunteer'
  const [profile, setProfile] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [form, setForm] = useState({
    skills: '', availability: '', preferred_areas: '',
    experience_years: 0, bio: '', is_available: true
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (isVolunteer) {
          try {
            const { data } = await api.get('/volunteers/me/profile')
            setProfile(data)
            setHasProfile(true)
            setForm({
              skills: data.skills || '', availability: data.availability || '',
              preferred_areas: data.preferred_areas || '',
              experience_years: data.experience_years || 0,
              bio: data.bio || '', is_available: data.is_available
            })
          } catch (err: any) {
            if (err.response?.status === 404) setHasProfile(false)
          }
        }
        const { data: asgn } = await api.get('/assignments/')
        setAssignments(asgn)
      } finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (hasProfile) {
        await api.patch('/volunteers/me/profile', form)
        toast.success('Profile updated!')
      } else {
        await api.post('/volunteers/me/profile', form)
        setHasProfile(true)
        toast.success('Profile created!')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleComplete = async (id: string) => {
    try {
      await api.patch(`/assignments/${id}`, { status: 'completed' })
      toast.success('Task marked as completed!')
      const { data } = await api.get('/assignments/')
      setAssignments(data)
    } catch { toast.error('Failed to update') }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
    </div>
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>My Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account and volunteer preferences</p>
      </motion.div>

      {/* Account card */}
      <motion.div variants={item} className="card">
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${roleGradients[user?.role || 'volunteer']} flex items-center justify-center text-white font-bold text-2xl shadow-xl`}>
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{user?.full_name}</h2>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r ${roleGradients[user?.role || 'volunteer']} text-white capitalize`}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          {isVolunteer && profile && (
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{profile.total_tasks_completed}</p>
              <p className="text-xs text-slate-500">Tasks Done</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/5">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Phone size={14} className="text-slate-600" />
            {user?.phone || <span className="text-slate-600">Not set</span>}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin size={14} className="text-slate-600" />
            {user?.location || <span className="text-slate-600">Not set</span>}
          </div>
        </div>
      </motion.div>

      {/* Volunteer profile form */}
      {isVolunteer && (
        <motion.div variants={item} className="card">
          <h2 className="font-bold text-white text-lg mb-5">
            {hasProfile ? 'Update Volunteer Profile' : '✨ Create Your Volunteer Profile'}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="input-label">Skills (comma-separated)</label>
              <input className="input" placeholder="medical, teaching, driving, logistics..." value={form.skills} onChange={e => setForm(f => ({...f, skills: e.target.value}))} />
              {form.skills && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.skills.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                    <span key={s} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="input-label">Preferred Areas (comma-separated cities)</label>
              <input className="input" placeholder="Mumbai, Pune, Delhi..." value={form.preferred_areas} onChange={e => setForm(f => ({...f, preferred_areas: e.target.value}))} />
            </div>
            <div>
              <label className="input-label">Years of Experience</label>
              <input type="number" className="input" min={0} max={50} value={form.experience_years} onChange={e => setForm(f => ({...f, experience_years: +e.target.value}))} />
            </div>
            <div>
              <label className="input-label">Bio</label>
              <textarea className="input h-20 resize-none" placeholder="Tell us about your background and motivation..." value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} />
            </div>
            <div
              onClick={() => setForm(f => ({...f, is_available: !f.is_available}))}
              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                form.is_available
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-slate-800/50 border-white/10'
              }`}
            >
              <div className={`w-10 h-5 rounded-full transition-all duration-300 relative ${form.is_available ? 'bg-green-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${form.is_available ? 'left-5' : 'left-0.5'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Available for tasks</p>
                <p className="text-xs text-slate-500">{form.is_available ? 'You will appear in volunteer matching' : 'You are hidden from matching'}</p>
              </div>
            </div>
            <motion.button type="submit" className="btn-primary flex items-center gap-2" disabled={saving} whileTap={{ scale: 0.97 }}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {hasProfile ? 'Save Changes' : 'Create Profile'}
            </motion.button>
          </form>
        </motion.div>
      )}

      {/* Assignments */}
      <motion.div variants={item} className="card">
        <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
          <Award size={18} className="text-yellow-400" /> My Assignments ({assignments.length})
        </h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No assignments yet. Accept a task to get started!</p>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => (
              <motion.div
                key={a.id}
                whileHover={{ x: 4 }}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-white/5 hover:border-white/10 transition-all"
              >
                <div>
                  <p className="text-sm font-medium text-white">Task #{a.task_id.slice(0, 8)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Match: <span className="text-blue-400 font-semibold">{a.match_score}%</span> · {new Date(a.assigned_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                    a.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    a.status === 'accepted' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>{a.status}</span>
                  {a.status === 'accepted' && (
                    <motion.button
                      onClick={() => handleComplete(a.id)}
                      whileTap={{ scale: 0.95 }}
                      className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle size={13} /> Complete
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
