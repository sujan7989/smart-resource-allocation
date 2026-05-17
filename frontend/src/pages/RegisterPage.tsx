import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import toast from 'react-hot-toast'
import {
  Mail, Lock, User, Phone, MapPin, Loader2, ArrowRight,
  Eye, EyeOff, Shield, AlertTriangle,
} from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import Logo from '../components/Logo'

const roles = [
  {
    value: 'volunteer',
    label: '🙋 Volunteer',
    desc: 'Help with tasks on the ground',
    color: 'border-blue-500/60 bg-blue-500/10 shadow-glow-blue',
  },
  {
    value: 'field_worker',
    label: '🗺️ Field Worker',
    desc: 'Submit community reports',
    color: 'border-green-500/60 bg-green-500/10',
  },
  {
    value: 'admin',
    label: '🛡️ Admin',
    desc: 'Manage the platform (invite required)',
    color: 'border-purple-500/60 bg-purple-500/10',
  },
]

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') || ''
  const roleFromUrl = searchParams.get('role') || ''

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: roleFromUrl === 'admin' && inviteToken ? 'admin' : 'volunteer',
    phone: '',
    location: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inviteValid, setInviteValid] = useState<boolean | null>(
    inviteToken ? null : null   // null = not yet checked / no invite
  )
  const [inviteChecked, setInviteChecked] = useState(!inviteToken) // true when no invite or check done
  const [inviteEmail, setInviteEmail] = useState('')

  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  // Validate invite token on load if present in URL
  useEffect(() => {
    if (!inviteToken) return
    api
      .get(`/auth/validate-invite/${inviteToken}`)
      .then((res) => {
        setInviteValid(true)
        setInviteChecked(true)
        if (res.data.invited_email) {
          setInviteEmail(res.data.invited_email)
          setForm((f) => ({ ...f, email: res.data.invited_email, role: 'admin' }))
        } else {
          setForm((f) => ({ ...f, role: 'admin' }))
        }
      })
      .catch(() => {
        setInviteValid(false)
        setInviteChecked(true)
        toast.error('This invite link is invalid or has expired.')
      })
  }, [inviteToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const passwordErrors: string[] = []
  if (form.password.length > 0 && form.password.length < 8) passwordErrors.push('At least 8 characters')
  if (form.password.length > 0 && !/[A-Z]/.test(form.password)) passwordErrors.push('One uppercase letter')
  if (form.password.length > 0 && !/\d/.test(form.password)) passwordErrors.push('One digit')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordErrors.length > 0) {
      toast.error('Please fix password requirements')
      return
    }
    if (form.role === 'admin' && !inviteToken) {
      toast.error('An invite token is required to register as admin.')
      return
    }
    setLoading(true)
    try {
      const payload: Record<string, string> = { ...form }
      if (form.role === 'admin' && inviteToken) {
        payload.invite_token = inviteToken
      }
      const { data } = await api.post('/auth/register', payload)
      setUser(data)
      toast.success('Account created! Welcome aboard 🎉')
      navigate('/dashboard')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || 'Registration failed')
      } else {
        toast.error(detail || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  // While validating invite token, show a spinner
  if (inviteToken && !inviteChecked) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-6 overflow-hidden">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="card glow-blue">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              {form.role === 'admin' ? '🛡️ Create Admin Account' : 'Join the platform'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {form.role === 'admin'
                ? 'You have been invited to become an administrator.'
                : 'Create your account and start making an impact'}
            </p>
          </div>

          {/* Invalid invite banner */}
          {inviteToken && inviteChecked && inviteValid === false && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-5">
              <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-400">Invalid invite link</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  This invite token is invalid or has expired. Ask the current admin to generate a new one.
                </p>
              </div>
            </div>
          )}

          {/* Admin invite banner */}
          {inviteToken && inviteChecked && inviteValid === true && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 mb-5">
              <Shield size={18} className="text-purple-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-300">Admin invite verified ✓</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {inviteEmail
                    ? `This invite is locked to ${inviteEmail}.`
                    : 'You can register with any email address.'}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector — hide if coming from an admin invite link */}
            {!inviteToken && (
              <div>
                <label className="input-label">I want to join as</label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map((r) => (
                    <motion.button
                      key={r.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                      whileTap={{ scale: 0.97 }}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                        form.role === r.value
                          ? r.color
                          : 'border-white/10 bg-slate-800/50 hover:border-white/20'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white leading-tight">{r.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{r.desc}</p>
                    </motion.button>
                  ))}
                </div>

                {/* Admin warning when selected without invite */}
                <AnimatePresence>
                  {form.role === 'admin' && !inviteToken && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
                    >
                      <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-300">
                        Admin registration requires an invite link from the current admin.
                        Ask them to go to <strong>Admin Panel → Generate Admin Invite</strong>.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div>
              <label className="input-label">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="full_name"
                  className="input pl-11"
                  placeholder="Your full name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="email"
                  type="email"
                  className="input pl-11"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  // Lock email field if invite is tied to a specific address
                  readOnly={!!(inviteEmail && inviteValid)}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-11 pr-11"
                  placeholder="Min 8 chars, 1 uppercase, 1 digit"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordErrors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {passwordErrors.map((err) => (
                    <li key={err} className="text-xs text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                      {err}
                    </li>
                  ))}
                </ul>
              )}
              {form.password.length >= 8 && passwordErrors.length === 0 && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-green-400 inline-block" />
                  Password looks good
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Phone <span className="text-slate-600">(optional)</span></label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    name="phone"
                    className="input pl-11"
                    placeholder="+1 555 000 0000"
                    value={form.phone}
                    onChange={handleChange}
                    maxLength={20}
                  />
                </div>
              </div>
              <div>
                <label className="input-label">City <span className="text-slate-600">(optional)</span></label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    name="location"
                    className="input pl-11"
                    placeholder="Your city"
                    value={form.location}
                    onChange={handleChange}
                    maxLength={100}
                  />
                </div>
              </div>
            </div>

            <motion.button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
              disabled={
                loading ||
                passwordErrors.length > 0 ||
                (form.role === 'admin' && !inviteToken) ||
                (inviteToken !== '' && inviteChecked && inviteValid === false)
              }
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
