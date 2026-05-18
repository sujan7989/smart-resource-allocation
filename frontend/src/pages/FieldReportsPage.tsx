import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import {
  Plus, Loader2, MapPin, Users, FileText, X, Eye,
  CheckCircle, XCircle, Globe, ArrowRight,
} from 'lucide-react'

interface FieldReport {
  id: string
  title: string
  description: string
  area: string
  city: string
  country: string
  estimated_affected: number
  urgency_observation?: string
  status: string
  admin_notes?: string
  community_need_id?: string
  created_at: string
}

const CATEGORIES = [
  'food', 'medical', 'education', 'shelter', 'water',
  'sanitation', 'mental_health', 'elderly_care', 'child_care', 'disaster_relief', 'other',
]
const URGENCIES = ['low', 'medium', 'high', 'critical']

const statusConfig: Record<string, { color: string; icon: typeof FileText }> = {
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
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [convertForm, setConvertForm] = useState({
    category: 'other',
    urgency: 'medium',
    title: '',
    description: '',
    affected_people: 0,
    reported_by_org: '',
    admin_notes: '',
  })
  const [convertSubmitting, setConvertSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '', description: '', area: '', city: '', country: '',
    estimated_affected: 0, urgency_observation: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/field-reports/')
      setReports(data)
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReports() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/field-reports/', form)
      toast.success('Field report submitted!')
      setShowForm(false)
      setForm({
        title: '', description: '', area: '', city: '', country: '',
        estimated_affected: 0, urgency_observation: '',
      })
      fetchReports()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReview = async (id: string, status: string) => {
    try {
      await api.patch(`/field-reports/${id}`, { status })
      toast.success(`Report marked as ${status}`)
      fetchReports()
    } catch {
      toast.error('Failed to update')
    }
  }

  const openConvertModal = (report: FieldReport) => {
    setConvertingId(report.id)
    setConvertForm({
      category: 'other',
      urgency: 'medium',
      title: report.title,
      description: report.description,
      affected_people: report.estimated_affected,
      reported_by_org: '',
      admin_notes: '',
    })
  }

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertingId) return
    setConvertSubmitting(true)
    try {
      await api.post(`/field-reports/${convertingId}/convert`, convertForm)
      toast.success('Report converted to Community Need!')
      setConvertingId(null)
      fetchReports()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to convert')
    } finally {
      setConvertSubmitting(false)
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Field Reports
          </h1>
          <p className="text-slate-400 text-sm mt-1">Ground-level observations from field workers</p>
        </div>
        {/* Only field workers and admins can submit reports */}
        {(user?.role === 'field_worker' || user?.role === 'admin') && (
          <motion.button
            onClick={() => setShowForm(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Submit Report
          </motion.button>
        )}      </motion.div>

      {/* Submit report form */}
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
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-500 hover:text-white transition-colors"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="input-label">Report Title</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  minLength={5}
                  maxLength={200}
                  placeholder="e.g. Elderly Isolation — Chennai Suburb"
                />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">Observation Details</label>
                <textarea
                  className="input h-24 resize-none"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required
                  minLength={10}
                  placeholder="Describe what you observed in detail..."
                />
              </div>
              <div>
                <label className="input-label">Area / Locality</label>
                <input
                  className="input"
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  required
                  placeholder="e.g. Tambaram"
                />
              </div>
              <div>
                <label className="input-label">City</label>
                <input
                  className="input"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  required
                  placeholder="e.g. Chennai"
                />
              </div>
              <div>
                <label className="input-label">Country</label>
                <div className="relative">
                  <Globe size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    className="input pl-11"
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    required
                    placeholder="e.g. India, Nigeria, Brazil"
                  />
                </div>
              </div>
              <div>
                <label className="input-label">Estimated Affected People</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={form.estimated_affected}
                  onChange={e => setForm(f => ({ ...f, estimated_affected: +e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">Urgency Observation <span className="text-slate-600">(optional)</span></label>
                <input
                  className="input"
                  placeholder="e.g. High — immediate action needed"
                  value={form.urgency_observation}
                  onChange={e => setForm(f => ({ ...f, urgency_observation: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
                  {submitting && <Loader2 size={14} className="animate-spin" />} Submit Report
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convert to Need modal */}
      <AnimatePresence>
        {convertingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setConvertingId(null) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card w-full max-w-lg border-green-500/20 glow-blue"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-white text-lg flex items-center gap-2">
                    <ArrowRight size={18} className="text-green-400" />
                    Convert to Community Need
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This will create a new verified Community Need from this report
                  </p>
                </div>
                <button
                  onClick={() => setConvertingId(null)}
                  className="text-slate-500 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleConvert} className="space-y-4">
                <div>
                  <label className="input-label">Title</label>
                  <input
                    className="input"
                    value={convertForm.title}
                    onChange={e => setConvertForm(f => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Category</label>
                    <select
                      className="input bg-slate-800/80"
                      value={convertForm.category}
                      onChange={e => setConvertForm(f => ({ ...f, category: e.target.value }))}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c} className="bg-slate-800 capitalize">
                          {c.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Urgency</label>
                    <select
                      className="input bg-slate-800/80"
                      value={convertForm.urgency}
                      onChange={e => setConvertForm(f => ({ ...f, urgency: e.target.value }))}
                    >
                      {URGENCIES.map(u => (
                        <option key={u} value={u} className="bg-slate-800 capitalize">{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="input-label">Affected People</label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    value={convertForm.affected_people}
                    onChange={e => setConvertForm(f => ({ ...f, affected_people: +e.target.value }))}
                  />
                </div>
                <div>
                  <label className="input-label">Reporting Organization <span className="text-slate-600">(optional)</span></label>
                  <input
                    className="input"
                    value={convertForm.reported_by_org}
                    onChange={e => setConvertForm(f => ({ ...f, reported_by_org: e.target.value }))}
                    placeholder="NGO name"
                  />
                </div>
                <div>
                  <label className="input-label">Admin Notes <span className="text-slate-600">(optional)</span></label>
                  <textarea
                    className="input h-16 resize-none"
                    value={convertForm.admin_notes}
                    onChange={e => setConvertForm(f => ({ ...f, admin_notes: e.target.value }))}
                    placeholder="Internal notes about this conversion..."
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" className="btn-secondary" onClick={() => setConvertingId(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex items-center gap-2" disabled={convertSubmitting}>
                    {convertSubmitting && <Loader2 size={14} className="animate-spin" />}
                    Convert to Need
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <motion.div variants={container} className="grid gap-4">
          {reports.map(report => {
            const sc = statusConfig[report.status] || statusConfig.submitted
            return (
              <motion.div
                key={report.id}
                variants={item}
                whileHover={{ y: -2 }}
                className="card hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-white">{report.title}</h3>
                      <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${sc.color}`}>
                        <sc.icon size={10} /> {report.status}
                      </span>
                      {report.community_need_id && (
                        <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                          Linked to Need
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2">{report.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />{report.area}, {report.city}
                        {report.country && `, ${report.country}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} />~{report.estimated_affected.toLocaleString()} affected
                      </span>
                      {report.urgency_observation && (
                        <span className="text-orange-400">{report.urgency_observation}</span>
                      )}
                    </div>
                    {report.admin_notes && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-white/5">
                        <p className="text-xs text-slate-400">
                          <span className="text-slate-300 font-medium">Admin note:</span> {report.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {report.status === 'submitted' && (
                        <>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReview(report.id, 'reviewed')}
                            className="text-xs btn-secondary py-1.5 px-3"
                          >
                            Review
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openConvertModal(report)}
                            className="text-xs btn-primary py-1.5 px-3 flex items-center gap-1"
                          >
                            <ArrowRight size={11} /> Convert
                          </motion.button>
                          <button
                            onClick={() => handleReview(report.id, 'rejected')}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors text-center"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {report.status === 'reviewed' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openConvertModal(report)}
                          className="text-xs btn-primary py-1.5 px-3 flex items-center gap-1"
                        >
                          <ArrowRight size={11} /> Convert to Need
                        </motion.button>
                      )}
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
