import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Mail, Lock, ArrowRight, Loader2, Users, Heart, BarChart3, Zap } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import Logo from '../components/Logo'

const features = [
  { icon: Heart, label: 'Community Needs', desc: 'Track & prioritize urgent needs', color: 'text-red-400' },
  { icon: Users, label: 'Smart Matching', desc: 'AI-powered volunteer matching', color: 'text-blue-400' },
  { icon: BarChart3, label: 'Live Dashboard', desc: 'Real-time impact analytics', color: 'text-green-400' },
  { icon: Zap, label: 'Field Reports', desc: 'Ground-level data collection', color: 'text-yellow-400' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [liveStats, setLiveStats] = useState<{
    people: number; needs: number; volunteers: number
  } | null>(null)
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  // Fetch real live stats for the login page (public endpoint)
  useEffect(() => {
    api.get('/dashboard/public-stats')
      .then(r => setLiveStats(r.data))
      .catch(() => setLiveStats(null))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setUser(data)
      toast.success(`Welcome back, ${data.full_name}!`)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const stats = liveStats
    ? [
        [liveStats.people.toLocaleString(), 'People Helped'] as [string, string],
        [String(liveStats.needs), 'Active Needs'] as [string, string],
        [String(liveStats.volunteers), 'Volunteers Ready'] as [string, string],
      ]
    : null

  return (
    <div className="min-h-screen animated-bg flex overflow-hidden">
      <AnimatedBackground />

      {/* Left panel — branding */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative z-10"
      >
        <Logo size="lg" />

        <div className="space-y-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-5xl font-bold leading-tight"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Connecting
              <span className="block text-gradient">Volunteers</span>
              <span className="block">to Impact</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="text-slate-400 text-lg mt-4 leading-relaxed"
            >
              Data-driven coordination platform that matches the right volunteers
              to the most urgent community needs — in real time.
            </motion.p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                className="glass p-4 rounded-2xl hover:bg-white/10 transition-all duration-300 group"
              >
                <f.icon size={22} className={`${f.color} mb-2 group-hover:scale-110 transition-transform`} />
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live stats from real database */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.7 }}
          className="flex gap-8"
        >
          {stats && (stats[0][0] !== '0' || stats[1][0] !== '0' || stats[2][0] !== '0') ? (
            stats.map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold text-gradient">{val}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            ))
          ) : (
            <div className="glass px-4 py-3 rounded-xl">
              <p className="text-sm text-slate-300 font-medium">Empowering NGOs globally</p>
              <p className="text-xs text-slate-500 mt-0.5">Real-time data updates as your team works</p>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="card glow-blue">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Welcome back
              </h2>
              <p className="text-slate-400 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="input-label">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    className="input pl-11"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    aria-label="Email address"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    className="input pl-11"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    aria-label="Password"
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <motion.button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </motion.button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              New here?{' '}
              <Link to="/register" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
