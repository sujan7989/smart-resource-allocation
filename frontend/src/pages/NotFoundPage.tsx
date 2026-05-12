import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import Logo from '../components/Logo'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-6">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center relative z-10"
      >
        <Logo size="md" showText={false} />
        <h1 className="text-8xl font-bold text-gradient mt-6 mb-2">404</h1>
        <p className="text-xl font-semibold text-white mb-2">Page not found</p>
        <p className="text-slate-400 mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2">
          <Home size={16} /> Go to Dashboard
        </Link>
      </motion.div>
    </div>
  )
}
