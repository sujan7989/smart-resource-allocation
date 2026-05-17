import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import {
  Plus, X, Loader2, Shield, Users, UserCheck, Trash2,
  ToggleLeft, ToggleRight, CheckCircle, XCircle, Key, Edit2,
  Link as LinkIcon, Copy, Mail,
} from 'lucide-react'

interface UserItem {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  phone?: string
  location?: string
  created_at: string
}

interface Assignment {
  id: string
  task_id: string
  volunteer_id: string
  status: string
  match_score: number
  assigned_at: string
  task_title?: string
  task_city?: string
  volunteer_name?: string
  volunteer_email?: string
}

const roleColors: Record<string, string> = {
  admin:        'bg-purple-500/20 text-purple-400 border-purple-500/30',
  volunteer:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  field_worker: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function AdminPage() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<UserItem[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Create user form
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: 'volunteer', phone: '', location: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Reset password modal
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  // Edit role modal
  const [editRoleUser, setEditRoleUser] = useState<UserItem | null>(null)
  const [newRole, setNewRole] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  // Admin invite
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ invite_url: string; invite_token: string } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, assignRes] = await Promise.all([
        api.get('/users/'),
        api.get('/assignments/'),
      ])
      setUsers(usersRes.data)
      setAssignments(assignRes.data)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/users/', form)
      toast.success(`${form.role} account created!`)
      setShowForm(false)
      setForm({ full_name: '', email: '', password: '', role: 'volunteer', phone: '', location: '' })
      fetchData()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (userId: string, isActive: boolean, name: string) => {
    const action = isActive ? 'deactivate' : 'activate'
    if (isActive && !confirm(`Deactivate ${name}? They will be logged out on their next request.`)) return
    try {
      await api.patch(`/users/${userId}`, { is_active: !isActive })
      toast.success(isActive ? `${name} deactivated` : `${name} activated`)
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to ${action}`)
    }
  }

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return
    try {
      await api.delete(`/users/${userId}`)
      toast.success('User deleted')
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetUserId) return
    setResetting(true)
    try {
      await api.post(`/users/${resetUserId}/reset-password`, { new_password: resetPassword })
      toast.success('Password reset successfully')
      setResetUserId(null)
      setResetPassword('')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRoleUser) return
    setSavingRole(true)
    try {
      await api.patch(`/users/${editRoleUser.id}`, { role: newRole })
      toast.success(`Role updated to ${newRole}`)
      setEditRoleUser(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update role')
    } finally {
      setSavingRole(false)
    }
  }

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneratingInvite(true)
    try {
      const { data } = await api.post('/users/invite-admin', {
        invited_email: inviteEmail || null,
      })
      setInviteResult(data)
      toast.success(inviteEmail ? 'Invite sent by email!' : 'Invite link generated!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate invite')
    } finally {
      setGeneratingInvite(false)
    }
  }

  const copyInviteLink = () => {
    if (!inviteResult) return
    navigator.clipboard.writeText(inviteResult.invite_url)
    toast.success('Invite link copied!')
  }

  const handleApproveAssignment = async (assignmentId: string) => {
    try {
      await api.patch(`/assignments/${assignmentId}`, { status: 'accepted' })
      toast.success('Assignment approved!')
      fetchData()
    } catch {
      toast.error('Failed to approve')
    }
  }

  const handleRejectAssignment = async (assignmentId: string) => {
    try {
      await api.patch(`/assignments/${assignmentId}`, { status: 'rejected' })
      toast.success('Assignment rejected')
      fetchData()
    } catch {
      toast.error('Failed to reject')
    }
  }

  const pendingAssignments = assignments.filter(a => a.status === 'pending')
  const adminCount = users.filter(u => u.role === 'admin').length
  const volunteerCount = users.filter(u => u.role === 'volunteer').length
  const fieldWorkerCount = users.filter(u => u.role === 'field_worker').length

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            User Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage all users, roles and assignments</p>
        </div>
        <motion.button
          onClick={() => setShowForm(true)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add User
        </motion.button>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={item} className="grid grid-cols-3 gap-4">
        {[
          { label: 'Admins',        count: adminCount,       icon: Shield,    color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/20' },
          { label: 'Volunteers',    count: volunteerCount,   icon: Users,     color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/20' },
          { label: 'Field Workers', count: fieldWorkerCount, icon: UserCheck, color: 'from-green-500/20 to-emerald-500/20 border-green-500/20' },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl border bg-gradient-to-br ${c.color} p-4`}>
            <c.icon size={20} className="text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-white">{c.count}</p>
            <p className="text-sm text-slate-400">{c.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Admin invite section */}
      <motion.div variants={item} className="card border-purple-500/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-purple-400" />
            <h2 className="font-bold text-white">Transfer Admin Access</h2>
          </div>
          <motion.button
            onClick={() => { setShowInvite(!showInvite); setInviteResult(null); setInviteEmail('') }}
            whileTap={{ scale: 0.97 }}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            {showInvite ? 'Close' : 'Generate Invite'}
          </motion.button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Generate a one-time invite link to hand admin access to someone else.
          The link expires in 48 hours and can only be used once.
        </p>

        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {!inviteResult ? (
                <form onSubmit={handleGenerateInvite} className="space-y-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="input-label flex items-center gap-1">
                      <Mail size={13} /> Invite email <span className="text-slate-600">(optional — locks invite to this address)</span>
                    </label>
                    <input
                      type="email"
                      className="input"
                      placeholder="newadmin@ngo.org"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary text-sm py-2 flex items-center gap-2"
                    disabled={generatingInvite}
                  >
                    {generatingInvite
                      ? <Loader2 size={14} className="animate-spin" />
                      : <LinkIcon size={14} />
                    }
                    {inviteEmail ? 'Send Invite Email' : 'Generate Invite Link'}
                  </button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-2 border-t border-white/5 space-y-3"
                >
                  <p className="text-xs text-green-400 font-medium">
                    ✓ Invite {inviteEmail ? `sent to ${inviteEmail}` : 'generated'} — valid for 48 hours
                  </p>
                  <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-slate-400 truncate flex-1 font-mono">
                      {inviteResult.invite_url}
                    </p>
                    <motion.button
                      onClick={copyInviteLink}
                      whileTap={{ scale: 0.95 }}
                      className="text-slate-400 hover:text-white transition-colors shrink-0"
                      title="Copy link"
                    >
                      <Copy size={15} />
                    </motion.button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Share this link with the new admin. It can only be used once.
                  </p>
                  <button
                    onClick={() => { setInviteResult(null); setInviteEmail('') }}
                    className="text-xs text-slate-500 hover:text-white transition-colors"
                  >
                    Generate another
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Pending assignments alert */}      {pendingAssignments.length > 0 && (
        <motion.div variants={item} className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-amber-400 font-semibold text-sm mb-3">
            ⏳ {pendingAssignments.length} assignment{pendingAssignments.length > 1 ? 's' : ''} waiting for your approval
          </p>
          <div className="space-y-2">
            {pendingAssignments.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3">
                <div>
                  <p className="text-sm font-medium text-white">{a.volunteer_name || 'Volunteer'}</p>
                  <p className="text-xs text-slate-500">
                    {a.task_title
                      ? <span className="text-slate-300">{a.task_title}</span>
                      : `Task #${a.task_id.slice(0, 8)}`}
                    {' · '}Match: <span className="text-blue-400 font-semibold">{a.match_score}%</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => handleApproveAssignment(a.id)}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1 bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    <CheckCircle size={13} /> Approve
                  </motion.button>
                  <motion.button
                    onClick={() => handleRejectAssignment(a.id)}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <XCircle size={13} /> Reject
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Create user form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            className="card border-blue-500/20 glow-blue"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">Create New User</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Role selector */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { value: 'admin',        label: '🛡️ Admin',        desc: 'Full access' },
                { value: 'volunteer',    label: '🙋 Volunteer',    desc: 'Accept tasks' },
                { value: 'field_worker', label: '🗺️ Field Worker', desc: 'Submit reports' },
              ].map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: r.value }))}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                    form.role === r.value
                      ? 'border-blue-500/60 bg-blue-500/10'
                      : 'border-white/10 bg-slate-800/50 hover:border-white/20'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{r.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Full Name</label>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  required
                  minLength={2}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="jane@ngo.org"
                />
              </div>
              <div>
                <label className="input-label">Password</label>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  placeholder="Min 8 chars, 1 uppercase, 1 digit"
                />
              </div>
              <div>
                <label className="input-label">City <span className="text-slate-600">(optional)</span></label>
                <input
                  className="input"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Lagos"
                />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
                  {submitting && <Loader2 size={14} className="animate-spin" />} Create User
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset password modal */}
      <AnimatePresence>
        {resetUserId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) { setResetUserId(null); setResetPassword('') } }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card w-full max-w-sm border-orange-500/20"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="font-bold text-white text-lg mb-1 flex items-center gap-2">
                <Key size={18} className="text-orange-400" /> Reset Password
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Set a new password for {users.find(u => u.id === resetUserId)?.full_name}
              </p>
              <form onSubmit={handleResetPassword} className="space-y-3">
                <input
                  type="password"
                  className="input"
                  placeholder="New password (min 8 chars, 1 uppercase, 1 digit)"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    className="btn-secondary text-sm py-2"
                    onClick={() => { setResetUserId(null); setResetPassword('') }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm py-2 flex items-center gap-2" disabled={resetting}>
                    {resetting && <Loader2 size={13} className="animate-spin" />} Reset Password
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit role modal */}
      <AnimatePresence>
        {editRoleUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setEditRoleUser(null) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card w-full max-w-sm border-blue-500/20"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="font-bold text-white text-lg mb-1 flex items-center gap-2">
                <Edit2 size={18} className="text-blue-400" /> Change Role
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Changing role for <span className="text-white">{editRoleUser.full_name}</span>
              </p>
              <form onSubmit={handleSaveRole} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'admin',        label: '🛡️ Admin' },
                    { value: 'volunteer',    label: '🙋 Volunteer' },
                    { value: 'field_worker', label: '🗺️ Field Worker' },
                  ].map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setNewRole(r.value)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        newRole === r.value
                          ? 'border-blue-500/60 bg-blue-500/10 text-white'
                          : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" className="btn-secondary text-sm py-2" onClick={() => setEditRoleUser(null)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-sm py-2 flex items-center gap-2"
                    disabled={savingRole || !newRole || newRole === editRoleUser.role}
                  >
                    {savingRole && <Loader2 size={13} className="animate-spin" />} Save Role
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <motion.div variants={container} className="grid gap-3">
          {users.map(u => (
            <motion.div
              key={u.id}
              variants={item}
              className={`card hover:border-white/20 transition-all duration-300 ${!u.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                    u.role === 'admin'        ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                    u.role === 'volunteer'    ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                                               'bg-gradient-to-br from-green-500 to-emerald-600'
                  }`}>
                    {u.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{u.full_name}</p>
                      {u.id === currentUser?.id && (
                        <span className="text-xs text-slate-500">(you)</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {u.location && (
                    <span className="text-xs text-slate-500 hidden md:block">{u.location}</span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${roleColors[u.role]}`}>
                    {u.role.replace('_', ' ')}
                  </span>

                  {u.id !== currentUser?.id && (
                    <div className="flex items-center gap-1">
                      {/* Change role */}
                      <motion.button
                        onClick={() => { setEditRoleUser(u); setNewRole(u.role) }}
                        whileTap={{ scale: 0.95 }}
                        className="text-slate-500 hover:text-blue-400 transition-colors p-1"
                        title="Change role"
                      >
                        <Edit2 size={15} />
                      </motion.button>

                      {/* Reset password */}
                      <motion.button
                        onClick={() => setResetUserId(u.id)}
                        whileTap={{ scale: 0.95 }}
                        className="text-slate-500 hover:text-orange-400 transition-colors p-1"
                        title="Reset password"
                      >
                        <Key size={15} />
                      </motion.button>

                      {/* Toggle active */}
                      <motion.button
                        onClick={() => handleToggleActive(u.id, u.is_active, u.full_name)}
                        whileTap={{ scale: 0.95 }}
                        className="text-slate-500 hover:text-white transition-colors p-1"
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {u.is_active
                          ? <ToggleRight size={20} className="text-green-400" />
                          : <ToggleLeft size={20} />
                        }
                      </motion.button>

                      {/* Delete */}
                      <motion.button
                        onClick={() => handleDeleteUser(u.id, u.full_name)}
                        whileTap={{ scale: 0.95 }}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        title="Delete user"
                      >
                        <Trash2 size={15} />
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {users.length === 0 && (
            <div className="card text-center py-12 text-slate-500">No users found</div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
