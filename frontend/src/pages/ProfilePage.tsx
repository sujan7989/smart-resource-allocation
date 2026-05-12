import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import {
  Loader2, CheckCircle, Award, MapPin, Phone, Lock, Edit2, Save,
  Star, MessageSquare, FileText, Eye, Clock,
} from 'lucide-react'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const roleGradients: Record<string, string> = {
  admin: 'from-purple-500 to-indigo-600',
  volunteer: 'from-blue-500 to-cyan-600',
  field_worker: 'from-green-500 to-emerald-600',
}

interface Assignment {
  id: string
  task_id: string
  task_title?: string
  task_city?: string
  status: string
  match_score: number
  assigned_at: string
  completed_at?: string
  feedback?: string
  rating?: number
}

interface FieldReport {
  id: string
  title: string
  city: string
  status: string
  created_at: string
}

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore()
  const isVolunteer = user?.role === 'volunteer'
  const isFieldWorker = user?.role === 'field_worker'

  const [profile, setProfile] = useState<any>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)

  // Account edit
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountForm, setAccountForm] = useState({ full_name: '', phone: '', location: '' })

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current_password: '', new_password: '', confirm_password: '',
  })
  const [changingPassword, setChangingPassword] = useState(false)

  // Volunteer profile form
  const [form, setForm] = useState({
    skills: '', availability: '', preferred_areas: '',
    experience_years: 0, bio: '', is_available: true,
  })

  // Complete task modal
  const [completingAssignment, setCompletingAssignment] = useState<Assignment | null>(null)
  const [completeForm, setCompleteForm] = useState({ feedback: '', rating: 5, hours_spent: '' })
  const [completing, setCompleting] = useState(false)

  // Fetch all data for this user — extracted so it can be called after task completion too
  const fetchProfileData = async () => {
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
            is_available: data.is_available,
          })
        } catch (err: any) {
          if (err.response?.status === 404) setHasProfile(false)
        }
        const { data: asgn } = await api.get('/assignments/')
        setAssignments(asgn)
      }
      if (isFieldWorker) {
        const { data: reports } = await api.get('/field-reports/')
        setFieldReports(reports)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Sync account form with current user data (including role changes)
    setAccountForm({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      location: user?.location || '',
    })
    fetchProfileData()
  // Re-run if user role changes (e.g. admin updates this user's role)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.id])

  const handleSaveAccount = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch('/users/me', accountForm)
      // token is always present when authenticated — safe assertion
      setAuth(data, token as string)
      toast.success('Profile updated!')
      setEditingAccount(false)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    setChangingPassword(true)
    try {
      await api.post('/users/me/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      toast.success('Password changed successfully!')
      setShowPasswordForm(false)
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err: any) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
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
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const openCompleteModal = (assignment: Assignment) => {
    setCompletingAssignment(assignment)
    setCompleteForm({ feedback: '', rating: 5, hours_spent: '' })
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!completingAssignment) return
    setCompleting(true)
    try {
      await api.patch(`/assignments/${completingAssignment.id}`, {
        status: 'completed',
        feedback: completeForm.feedback || undefined,
        rating: completeForm.rating,
        hours_spent: completeForm.hours_spent ? parseInt(completeForm.hours_spent) : undefined,
      })
      toast.success('Task marked as completed!')
      setCompletingAssignment(null)
      // Refresh both assignments AND volunteer profile (rating/hours updated on backend)
      await fetchProfileData()
    } catch {
      toast.error('Failed to update')
    } finally {
      setCompleting(false)
    }
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
                  onChange={e => setAccountForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your name"
                  maxLength={100}
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
              <button
                onClick={() => setEditingAccount(false)}
                className="text-xs text-slate-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
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
              <input
                className="input py-2 text-sm"
                value={accountForm.phone}
                onChange={e => setAccountForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555 000 0000"
                maxLength={20}
              />
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
              <input
                className="input py-2 text-sm"
                value={accountForm.location}
                onChange={e => setAccountForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Your city"
                maxLength={100}
              />
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
                type="password"
                className="input"
                placeholder="Current password"
                value={passwordForm.current_password}
                onChange={e => setPasswordForm(f => ({ ...f, current_password: e.target.value }))}
                required
              />
              <input
                type="password"
                className="input"
                placeholder="New password (min 8 chars, 1 uppercase, 1 digit)"
                value={passwordForm.new_password}
                onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
                required
                minLength={8}
              />
              <input
                type="password"
                className="input"
                placeholder="Confirm new password"
                value={passwordForm.confirm_password}
                onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="btn-secondary text-sm py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm py-2 flex items-center gap-2"
                  disabled={changingPassword}
                >
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
              <label className="input-label">Skills <span className="text-slate-600">(comma-separated)</span></label>
              <input
                className="input"
                placeholder="medical, teaching, driving, logistics..."
                value={form.skills}
                onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                maxLength={500}
              />
              {form.skills && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.skills.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                    <span key={s} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="input-label">Preferred Areas <span className="text-slate-600">(comma-separated cities)</span></label>
              <input
                className="input"
                placeholder="Mumbai, Lagos, São Paulo..."
                value={form.preferred_areas}
                onChange={e => setForm(f => ({ ...f, preferred_areas: e.target.value }))}
              />
            </div>
            <div>
              <label className="input-label">Availability <span className="text-slate-600">(JSON format)</span></label>
              <input
                className="input"
                placeholder='{"days":["Saturday","Sunday"],"hours":"9am-5pm"}'
                value={form.availability}
                onChange={e => setForm(f => ({ ...f, availability: e.target.value }))}
              />
              <p className="text-xs text-slate-600 mt-1">
                Used by the matching engine to find best-fit tasks
              </p>
            </div>
            <div>
              <label className="input-label">Years of Experience</label>
              <input
                type="number"
                className="input"
                min={0}
                max={60}
                value={form.experience_years}
                onChange={e => setForm(f => ({ ...f, experience_years: +e.target.value }))}
              />
            </div>
            <div>
              <label className="input-label">Bio</label>
              <textarea
                className="input h-20 resize-none"
                placeholder="Tell us about your background and motivation..."
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                maxLength={1000}
              />
              <p className="text-xs text-slate-600 mt-1">{form.bio.length}/1000</p>
            </div>
            <div
              onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
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
                <p className="text-xs text-slate-500">
                  {form.is_available ? 'You will appear in volunteer matching' : 'You are hidden from matching'}
                </p>
              </div>
            </div>
            <motion.button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={saving}
              whileTap={{ scale: 0.97 }}
            >
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
                    <p className="text-sm font-medium text-white">
                      {a.task_title || `Task #${a.task_id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.task_city && <span>{a.task_city} · </span>}
                      Match: <span className="text-blue-400 font-semibold">{a.match_score}%</span>
                      {' · '}{new Date(a.assigned_at).toLocaleDateString()}
                    </p>
                    {a.feedback && (
                      <p className="text-xs text-slate-500 mt-1 italic">"{a.feedback}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                      a.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      a.status === 'accepted' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      a.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {a.status}
                    </span>
                    {a.status === 'accepted' && (
                      <motion.button
                        onClick={() => openCompleteModal(a)}
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

      {/* Field reports — field workers */}
      {isFieldWorker && (
        <motion.div variants={item} className="card">
          <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
            <FileText size={18} className="text-yellow-400" /> My Field Reports ({fieldReports.length})
          </h2>
          {fieldReports.length === 0 ? (
            <p className="text-sm text-slate-500">No reports submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {fieldReports.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-white/5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{r.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.city} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                    r.status === 'converted' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    r.status === 'reviewed' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    r.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Complete task modal */}
      <AnimatePresence>
        {completingAssignment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setCompletingAssignment(null) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card w-full max-w-md border-green-500/20"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="font-bold text-white text-lg mb-1 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" /> Complete Task
              </h2>
              <p className="text-sm text-slate-400 mb-5">
                {completingAssignment.task_title}
              </p>
              <form onSubmit={handleComplete} className="space-y-4">
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Star size={14} className="text-yellow-400" /> Rate this task experience
                  </label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCompleteForm(f => ({ ...f, rating: n }))}
                        className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all ${
                          completeForm.rating >= n
                            ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                            : 'bg-slate-800 border-white/10 text-slate-500 hover:border-white/20'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="input-label flex items-center gap-2">
                    <MessageSquare size={14} /> Feedback <span className="text-slate-600">(optional)</span>
                  </label>
                  <textarea
                    className="input h-20 resize-none"
                    placeholder="Share your experience with this task..."
                    value={completeForm.feedback}
                    onChange={e => setCompleteForm(f => ({ ...f, feedback: e.target.value }))}
                    maxLength={500}
                  />
                </div>
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Clock size={14} /> Hours Spent <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 4"
                    min={0}
                    max={720}
                    value={completeForm.hours_spent}
                    onChange={e => setCompleteForm(f => ({ ...f, hours_spent: e.target.value }))}
                  />
                </div>                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setCompletingAssignment(null)}
                    className="btn-secondary text-sm py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-sm py-2 flex items-center gap-2"
                    disabled={completing}
                  >
                    {completing && <Loader2 size={13} className="animate-spin" />}
                    Mark Complete
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
