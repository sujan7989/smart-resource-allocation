import { useEffect, useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Plus, Loader2, MapPin, Users } from 'lucide-react'

interface FieldReport {
  id: string; title: string; description: string; area: string; city: string
  country: string; estimated_affected: number; urgency_observation?: string
  status: string; admin_notes?: string; created_at: string; submitted_by_id: string
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

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
      fetchReports()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit report')
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
      toast.error('Failed to update report')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Ground-level observations from field workers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Submit Report
        </button>
      </div>

      {/* Submit form */}
      {showForm && (
        <div className="card border-primary-200">
          <h2 className="font-semibold text-gray-800 mb-4">New Field Report</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observation Details</label>
              <textarea className="input h-24 resize-none" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
              <input className="input" value={form.area} onChange={e => setForm(f => ({...f, area: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input className="input" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Affected People</label>
              <input type="number" className="input" min={0} value={form.estimated_affected} onChange={e => setForm(f => ({...f, estimated_affected: +e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Observation</label>
              <input className="input" placeholder="e.g. High — immediate action needed" value={form.urgency_observation} onChange={e => setForm(f => ({...f, urgency_observation: e.target.value}))} />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
                {submitting && <Loader2 size={14} className="animate-spin" />} Submit Report
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="grid gap-4">
          {reports.map(report => (
            <div key={report.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900">{report.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[report.status] || 'bg-gray-100 text-gray-600'}`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin size={12} />{report.area}, {report.city}</span>
                    <span className="flex items-center gap-1"><Users size={12} />~{report.estimated_affected} affected</span>
                    {report.urgency_observation && <span className="text-orange-600">{report.urgency_observation}</span>}
                  </div>
                  {report.admin_notes && (
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded p-2">Admin note: {report.admin_notes}</p>
                  )}
                </div>
                {isAdmin && report.status === 'submitted' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => handleReview(report.id, 'reviewed')} className="text-xs btn-secondary py-1">Review</button>
                    <button onClick={() => handleReview(report.id, 'converted')} className="text-xs btn-primary py-1">Convert to Need</button>
                    <button onClick={() => handleReview(report.id, 'rejected')} className="text-xs text-red-500 hover:underline">Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="card text-center py-12 text-gray-400">No field reports yet</div>
          )}
        </div>
      )}
    </div>
  )
}
