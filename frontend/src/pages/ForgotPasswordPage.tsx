import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import Logo from '../components/Logo'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [resetUrl, setResetUrl] = useState<string | null>(null)   // set when SMTP not configured
  const [emailConfigured, setEmailConfigured] = useState(true)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setEmailConfigured(data.email_configured ?? true)
      if (data.reset_url) {
        // SMTP not configured — backend returned the link directly
        setResetUrl(data.reset_url)
      }
      setSent(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
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
          {!sent ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Forgot your password?
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Enter your email and we'll send you a reset link valid for 1 hour.
                </p>
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
                      autoComplete="email"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
                </motion.button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                    <CheckCircle size={32} className="text-green-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {emailConfigured ? 'Check your inbox' : 'Reset link ready'}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {emailConfigured
                    ? <>A password reset link has been sent to <span className="text-white font-medium">{email}</span>. Check your inbox (and spam folder).</>
                    : <>Email delivery is not configured on this server. Use the link below to reset your password directly.</>
                  }
                </p>
              </div>

              {/* Show direct link when SMTP not configured */}
              {resetUrl && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300">
                      Email not configured — click the button below to reset your password now.
                    </p>
                  </div>
                  <motion.button
                    onClick={() => navigate(resetUrl.replace(window.location.origin, ''))}
                    whileTap={{ scale: 0.97 }}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                  >
                    <ExternalLink size={16} /> Reset My Password Now
                  </motion.button>
                </div>
              )}

              {!resetUrl && (
                <p className="text-center text-slate-500 text-xs">
                  Didn't receive it? Check your spam folder or{' '}
                  <button
                    onClick={() => setSent(false)}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    try again
                  </button>.
                </p>
              )}
            </motion.div>
          )}

          <div className="mt-6 pt-5 border-t border-white/5 flex justify-center">
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
