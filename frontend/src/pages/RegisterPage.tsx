import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Mail, Lock, User, Phone, MapPin, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import Logo from '../components/Logo'

export default function RegisterPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'volunteer',
    phone: '',
    location: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  // Client-side password strength check (mirrors backend validation)
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
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setAuth(data.user, data.access_token)
      toast.success('Account created! Welcome aboard 🎉')
      navigate('/dashboard')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        // Pydantic validation errors
        toast.error(detail[0]?.msg || 'Registration failed')
      } else {
        toast.error(detail || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    { value: 'volunteer', label: '🙋 Volunteer', desc: 'Help with tasks on the ground' },
    { value: 'field_worker', label: '🗺️ Field Worker', desc: 'Submit community reports' },
  ]

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
              Join the platform
            </h2>
            <p className="text-slate-400 text-sm mt-1">Create your account and start making an impact</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="input-label">I want to join as</label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map(r => (
                  <motion.button
                    key={r.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    whileTap={{ scale: 0.97 }}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                      form.role === r.value
                        ? 'border-blue-500/60 bg-blue-500/10 shadow-glow-blue'
                        : 'border-white/10 bg-slate-800/50 hover:border-white/20'
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{r.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                  </motion.button>
                ))}
              </div>
            </div>

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
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength hints */}
              {passwordErrors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {passwordErrors.map(err => (
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
              disabled={loading || passwordErrors.length > 0}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
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
