import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Loader2, CheckCircle, Award, MapPin, Phone, Lock, Edit2, Save } from 'lucide-react'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const roleGradients: Record<string, string> = {
  admin: 'from-purple-500 to-indigo-600',
  volunteer: 'from-blue-500 to-cyan-600',
  field_worker: 'from-green-500 to-emerald-600',
}

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore()
  const isVolunteer = user?.role === 'volunteer'

  const [profile, setProfile] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)

  // Account edit
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountForm, setAccountForm] = useState({ full_name: '', phone: '', location: '' })

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  // Volunteer profile
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
          const { data: asgn } = await api.get('/assignments/')
          setAssignments(asgn)
        }
      } finally { setLoading(false) }
    }
    fetchData()
    setAccountForm({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      location: user?.location || ''
    })
  }, [])

  const handleSaveAccount = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch('/users/me', accountForm)
      // Update auth store with new user data
      setAuth(data, token!)
      toast.success('Profile updated!')
      setEditingAccount(false)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update')
    } finally { setSaving(false) }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setChangingPassword(true)
    try {
      await api.post('/users/me/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      })
      toast.success('Password changed successfully!')
      setShowPasswordForm(false)
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally { setChangingPassword(false) }
  }

  const handleSaveVolunteerProfile = async (e: React.FormEvent) => {
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
        <p className="text-slate-400 text-sm mt-1">Manage your account details and preferences</p>
      </motion.div>

      {/* Account card */}
      <motion.div variants={item} className="card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${roleGradients[user?.role || 'volunteer']} flex items-center justify-center text-white font-bold text-2xl shadow-xl`}>
              {(editingAccount ? accountForm.full_name : user?.full_name)?.charAt(0).toUpperCase()}
            </div>
            <div>
              {editingAccount ? (
                <input
                  className="input text-lg font-bold py-1.5 mb-1"
                  value={accountForm.full_name}
                  onChange={e => setAccountForm(f => ({...f, full_name: e.target.value}))}
                  placeholder="Your name"
                />
              ) : (
                <h2 className="text-xl font-bold text-white">{user?.full_name}</h2>
              )}
              <p className="text-slate-400 text-sm">{user?.email}</p>
              <span className={`inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r ${roleGradients[user?.role || 'volunteer']} text-white capitalize`}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
          {!editingAccount ? (
            <motion.button
              onClick={() => setEditingAccount(true)}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all"
            >
              <Edit2 size={13} /> Edit
            </motion.button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditingAccount(false)} className="text-xs text-slate-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
              <motion.button
                onClick={handleSaveAccount}
                whileTap={{ scale: 0.95 }}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs btn-primary py-1.5"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </motion.button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
          <div>
            <label className="input-label text-xs">Phone</label>
            {editingAccount ? (
              <input className="input py-2 text-sm" value={accountForm.phone} onChange={e => setAccountForm(f => ({...f, phone: e.target.value}))} placeholder="+91-..." />
            ) : (
              <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                <Phone size={13} className="text-slate-600" />
                {user?.phone || <span className="text-slate-600">Not set</span>}
              </p>
            )}
          </div>
          <div>
            <label className="input-label text-xs">City</label>
            {editingAccount ? (
              <input className="input py-2 text-sm" value={accountForm.location} onChange={e => setAccountForm(f => ({...f, location: e.target.value}))} placeholder="Mumbai" />
            ) : (
              <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                <MapPin size={13} className="text-slate-600" />
                {user?.location || <span className="text-slate-600">Not set</span>}
              </p>
            )}
          </div>
        </div>

        {/* Change password */}
        <div className="mt-4 pt-4 border-t border-white/5">
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Lock size={14} /> Change Password
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <p className="text-sm font-medium text-white">Change Password</p>
              <input
                type="password" className="input" placeholder="Current password"
                value={passwordForm.current_password}
                onChange={e => setPasswordForm(f => ({...f, current_password: e.target.value}))}
                required
              />
              <input
                type="password" className="input" placeholder="New password (min 6 chars)"
                value={passwordForm.new_password}
                onChange={e => setPasswordForm(f => ({...f, new_password: e.target.value}))}
                required minLength={6}
              />
              <input
                type="password" className="input" placeholder="Confirm new password"
                value={passwordForm.confirm_password}
                onChange={e => setPasswordForm(f => ({...f, confirm_password: e.target.value}))}
                required
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPasswordForm(false)} className="btn-secondary text-sm py-2">Cancel</button>
                <button type="submit" className="btn-primary text-sm py-2 flex items-center gap-2" disabled={changingPassword}>
                  {changingPassword && <Loader2 size={13} className="animate-spin" />} Update Password
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>

      {/* Volunteer profile form */}
      {isVolunteer && (
        <motion.div variants={item} className="card">
          <h2 className="font-bold text-white text-lg mb-5">
            {hasProfile ? 'Volunteer Profile' : '✨ Create Your Volunteer Profile'}
          </h2>
          <form onSubmit={handleSaveVolunteerProfile} className="space-y-4">
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
                form.is_available ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800/50 border-white/10'
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

      {/* Assignments — volunteers only */}
      {isVolunteer && (
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
                      a.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
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
      )}
    </motion.div>
  )
}
