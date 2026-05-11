import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Plus, Loader2, MapPin, Users, FileText, X, Eye, CheckCircle, XCircle } from 'lucide-react'

interface FieldReport {
  id: string; title: string; description: string; area: string; city: string
  country: string; estimated_affected: number; urgency_observation?: string
  status: string; admin_notes?: string; created_at: string
}

const statusConfig: Record<string, { color: string; icon: any }> = {
  submitted: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: FileText },
  reviewed: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Eye },
  converted: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function FieldReportsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [reports, setReports] = useState<FieldReport[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', area: '', city: '', country: 'India',
    estimated_affected: 0, urgency_observation: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/field-reports/')
      setReports(data)
    } catch { toast.error('Failed to load reports') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReports() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/field-reports/', form)
      toast.success('Field report submitted!')
      setShowForm(false)
      fetchReports()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSubmitting(false) }
  }

  const handleReview = async (id: string, status: string) => {
    try {
      await api.patch(`/field-reports/${id}`, { status })
      toast.success(`Report marked as ${status}`)
      fetchReports()
    } catch { toast.error('Failed to update') }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Field Reports</h1>
          <p className="text-slate-400 text-sm mt-1">Ground-level observations from field workers</p>
        </div>
        <motion.button onClick={() => setShowForm(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Submit Report
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            className="card border-blue-500/20 glow-blue"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">New Field Report</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="input-label">Report Title</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required placeholder="e.g. Elderly Isolation - Chennai Suburb" />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">Observation Details</label>
                <textarea className="input h-24 resize-none" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required placeholder="Describe what you observed in detail..." />
              </div>
              <div>
                <label className="input-label">Area / Locality</label>
                <input className="input" value={form.area} onChange={e => setForm(f => ({...f, area: e.target.value}))} required placeholder="Tambaram" />
              </div>
              <div>
                <label className="input-label">City</label>
                <input className="input" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} required placeholder="Chennai" />
              </div>
              <div>
                <label className="input-label">Estimated Affected People</label>
                <input type="number" className="input" min={0} value={form.estimated_affected} onChange={e => setForm(f => ({...f, estimated_affected: +e.target.value}))} />
              </div>
              <div>
                <label className="input-label">Urgency Observation</label>
                <input className="input" placeholder="e.g. High — immediate action needed" value={form.urgency_observation} onChange={e => setForm(f => ({...f, urgency_observation: e.target.value}))} />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
                  {submitting && <Loader2 size={14} className="animate-spin" />} Submit Report
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <motion.div variants={container} className="grid gap-4">
          {reports.map(report => {
            const sc = statusConfig[report.status] || statusConfig.submitted
            return (
              <motion.div key={report.id} variants={item} whileHover={{ y: -2 }} className="card hover:border-white/20 transition-all duration-300">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-white">{report.title}</h3>
                      <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${sc.color}`}>
                        <sc.icon size={10} /> {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2">{report.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin size={11} />{report.area}, {report.city}</span>
                      <span className="flex items-center gap-1"><Users size={11} />~{report.estimated_affected} affected</span>
                      {report.urgency_observation && (
                        <span className="text-orange-400">{report.urgency_observation}</span>
                      )}
                    </div>
                    {report.admin_notes && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-white/5">
                        <p className="text-xs text-slate-400"><span className="text-slate-300 font-medium">Admin note:</span> {report.admin_notes}</p>
                      </div>
                    )}
                  </div>
                  {isAdmin && report.status === 'submitted' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleReview(report.id, 'reviewed')} className="text-xs btn-secondary py-1.5 px-3">Review</motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleReview(report.id, 'converted')} className="text-xs btn-primary py-1.5 px-3">Convert</motion.button>
                      <button onClick={() => handleReview(report.id, 'rejected')} className="text-xs text-red-400 hover:text-red-300 transition-colors text-center">Reject</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
          {reports.length === 0 && (
            <motion.div variants={item} className="card text-center py-16">
              <FileText size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No field reports yet</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
