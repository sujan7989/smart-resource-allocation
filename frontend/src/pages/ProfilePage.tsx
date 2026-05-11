import { useEffect, useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Loader2, User, CheckCircle } from 'lucide-react'

interface Assignment {
  id: string; task_id: string; status: string; match_score: number
  assigned_at: string; completed_at?: string
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const isVolunteer = user?.role === 'volunteer'
  const [profile, setProfile] = useState<any>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
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
              skills: data.skills || '',
              availability: data.availability || '',
              preferred_areas: data.preferred_areas || '',
              experience_years: data.experience_years || 0,
              bio: data.bio || '',
              is_available: data.is_available
            })
          } catch (err: any) {
            if (err.response?.status === 404) setHasProfile(false)
          }
        }
        const { data: asgn } = await api.get('/assignments/')
        setAssignments(asgn)
      } finally {
        setLoading(false)
      }
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
      toast.error(err.response?.data?.detail || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await api.patch(`/assignments/${id}`, { status: 'completed' })
      toast.success('Task marked as completed!')
      const { data } = await api.get('/assignments/')
      setAssignments(data)
    } catch {
      toast.error('Failed to update')
    }
  }

  if (loading) return (
    <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and volunteer preferences</p>
      </div>

      {/* Account info */}
      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-primary-100 rounded-full p-4">
            <User size={24} className="text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{user?.full_name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full capitalize">{user?.role?.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
          <div><span className="font-medium">Phone:</span> {user?.phone || '—'}</div>
          <div><span className="font-medium">Location:</span> {user?.location || '—'}</div>
        </div>
      </div>

      {/* Volunteer profile form */}
      {isVolunteer && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">
            {hasProfile ? 'Update Volunteer Profile' : 'Create Volunteer Profile'}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
              <input className="input" placeholder="medical, teaching, driving..." value={form.skills} onChange={e => setForm(f => ({...f, skills: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Areas (comma-separated cities)</label>
              <input className="input" placeholder="Mumbai, Pune, Delhi..." value={form.preferred_areas} onChange={e => setForm(f => ({...f, preferred_areas: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
              <input type="number" className="input" min={0} value={form.experience_years} onChange={e => setForm(f => ({...f, experience_years: +e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea className="input h-20 resize-none" placeholder="Tell us about yourself..." value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="available" checked={form.is_available} onChange={e => setForm(f => ({...f, is_available: e.target.checked}))} className="rounded" />
              <label htmlFor="available" className="text-sm text-gray-700">I am currently available for tasks</label>
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {hasProfile ? 'Save Changes' : 'Create Profile'}
            </button>
          </form>
        </div>
      )}

      {/* My assignments */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">My Assignments ({assignments.length})</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-400">No assignments yet</p>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">Task ID: {a.task_id.slice(0, 8)}...</p>
                  <p className="text-xs text-gray-500">Match score: {a.match_score}% · Assigned {new Date(a.assigned_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.status === 'completed' ? 'bg-green-100 text-green-700' :
                    a.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                    a.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{a.status}</span>
                  {a.status === 'accepted' && (
                    <button onClick={() => handleComplete(a.id)} className="text-xs text-green-600 hover:underline flex items-center gap-1">
                      <CheckCircle size={12} /> Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
