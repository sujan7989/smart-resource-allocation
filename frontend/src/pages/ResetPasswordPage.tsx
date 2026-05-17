import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Lock, Loader2, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import Logo from '../components/Logo'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const passwordErrors: string[] = []
  if (password.length > 0 && password.length < 8) passwordErrors.push('At least 8 characters')
  if (password.length > 0 && !/[A-Z]/.test(password)) passwordErrors.push('One uppercase letter')
  if (password.length > 0 && !/\d/.test(password)) passwordErrors.push('One digit')

  const mismatch = confirm.length > 0 && password !== confirm

  if (!token) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-6">
        <AnimatedBackground />
        <div className="card max-w-md w-full text-center relative z-10">
          <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Invalid reset link</h2>
          <p className="text-slate-400 text-sm mb-6">
            This password reset link is missing a token. Please use the link from your email.
          </p>
          <Link to="/forgot-password" className="btn-primary inline-block">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordErrors.length > 0 || mismatch) return
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setDone(true)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      toast.error(detail || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-6 overflow-hidden">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="card glow-blue">
          {!done ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Set new password
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="input-label">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pl-11 pr-11"
                      placeholder="Min 8 chars, 1 uppercase, 1 digit"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  {password.length >= 8 && passwordErrors.length === 0 && (
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-green-400 inline-block" />
                      Password looks good
                    </p>
                  )}
                </div>

                <div>
                  <label className="input-label">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pl-11"
                      placeholder="Repeat your new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </div>
                  {mismatch && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                      Passwords do not match
                    </p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
                  disabled={loading || passwordErrors.length > 0 || mismatch || !password || !confirm}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Reset Password'}
                </motion.button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Password reset!</h3>
              <p className="text-slate-400 text-sm mb-6">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <motion.button
                onClick={() => navigate('/login')}
                className="btn-primary px-8 py-2.5"
                whileTap={{ scale: 0.97 }}
              >
                Go to Sign In
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
