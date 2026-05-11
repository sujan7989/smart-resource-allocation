import { useEffect, useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Users, MapPin, Star, CheckCircle, XCircle } from 'lucide-react'

interface Volunteer {
  id: string; email: string; full_name: string; location?: string; phone?: string
  profile?: {
    skills?: string; availability?: string; preferred_areas?: string
    experience_years: number; bio?: string; is_available: boolean
    total_tasks_completed: number; rating: number
  }
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [search, setSearch] = useState('')

  const fetchVolunteers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/volunteers/', { params: { available_only: availableOnly } })
      setVolunteers(data)
    } catch {
      toast.error('Failed to load volunteers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVolunteers() }, [availableOnly])

  const filtered = volunteers.filter(v =>
    v.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (v.location || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.profile?.skills || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Volunteers</h1>
        <p className="text-gray-500 text-sm mt-1">Manage and view all registered volunteers</p>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <input
          className="input flex-1 min-w-48"
          placeholder="Search by name, city, or skill..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} className="rounded" />
          Available only
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(vol => (
            <VolunteerCard key={vol.id} volunteer={vol} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full card text-center py-12 text-gray-400">No volunteers found</div>
          )}
        </div>
      )}
    </div>
  )
}

function VolunteerCard({ volunteer: v }: { volunteer: Volunteer }) {
  const p = v.profile
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{v.full_name}</h3>
          <p className="text-sm text-gray-500">{v.email}</p>
        </div>
        {p && (
          p.is_available
            ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle size={14} />Available</span>
            : <span className="flex items-center gap-1 text-xs text-gray-400 font-medium"><XCircle size={14} />Unavailable</span>
        )}
      </div>

      {v.location && (
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2"><MapPin size={12} />{v.location}</p>
      )}

      {p ? (
        <div className="space-y-2">
          {p.skills && (
            <div className="flex flex-wrap gap-1">
              {p.skills.split(',').map(s => (
                <span key={s} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{s.trim()}</span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{p.experience_years} yr{p.experience_years !== 1 ? 's' : ''} experience</span>
            <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400" />{p.total_tasks_completed} tasks done</span>
          </div>
          {p.bio && <p className="text-xs text-gray-600 line-clamp-2">{p.bio}</p>}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">No profile set up yet</p>
      )}
    </div>
  )
}
