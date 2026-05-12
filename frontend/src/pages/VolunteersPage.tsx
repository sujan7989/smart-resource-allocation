import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Users, MapPin, Star, CheckCircle, XCircle, Search } from 'lucide-react'

interface Volunteer {
  id: string
  email: string
  full_name: string
  location?: string
  phone?: string
  profile?: {
    skills?: string
    experience_years: number
    bio?: string
    is_available: boolean
    total_tasks_completed: number
    rating: number  // float from backend
    total_hours_contributed: number
  }
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/volunteers/', { params: { available_only: availableOnly } })
      .then(r => setVolunteers(r.data))
      .catch(() => toast.error('Failed to load volunteers'))
      .finally(() => setLoading(false))
  }, [availableOnly])

  // Client-side search across the fetched list
  // Note: the API returns all active volunteers (no pagination limit), so this is safe
  const filtered = volunteers.filter(v =>
    v.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (v.location || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.profile?.skills || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Volunteers
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          All registered volunteers and their profiles
          {volunteers.length > 0 && (
            <span className="ml-2 text-slate-600">({volunteers.length} total)</span>
          )}
        </p>
      </motion.div>

      <motion.div variants={item} className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-11"
            placeholder="Search by name, city, or skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search volunteers"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white transition-colors select-none">
          <div
            role="switch"
            aria-checked={availableOnly}
            onClick={() => setAvailableOnly(v => !v)}
            className={`w-10 h-5 rounded-full transition-all duration-300 relative cursor-pointer ${availableOnly ? 'bg-blue-600' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${availableOnly ? 'left-5' : 'left-0.5'}`} />
          </div>
          Available only
        </label>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(vol => (
            <motion.div
              key={vol.id}
              variants={item}
              whileHover={{ y: -4, scale: 1.01 }}
              className="card hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {vol.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{vol.full_name}</h3>
                    <p className="text-xs text-slate-500">{vol.email}</p>
                  </div>
                </div>
                {vol.profile && (
                  vol.profile.is_available
                    ? <span className="flex items-center gap-1 text-xs text-green-400 font-medium bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                        <CheckCircle size={11} /> Available
                      </span>
                    : <span className="flex items-center gap-1 text-xs text-slate-500 font-medium bg-slate-700/50 border border-slate-600 px-2 py-1 rounded-full">
                        <XCircle size={11} /> Busy
                      </span>
                )}
              </div>

              {vol.location && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                  <MapPin size={11} />{vol.location}
                </p>
              )}

              {vol.profile ? (
                <div className="space-y-3">
                  {vol.profile.skills && (
                    <div className="flex flex-wrap gap-1.5">
                      {vol.profile.skills.split(',').slice(0, 4).map(s => (
                        <span key={s} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2 py-0.5 rounded-full">
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-white/5">
                    <span>{vol.profile.experience_years} yr{vol.profile.experience_years !== 1 ? 's' : ''} exp</span>
                    <div className="flex items-center gap-3">
                      {vol.profile.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star size={11} className="text-yellow-400" />
                          {vol.profile.rating.toFixed(1)}
                        </span>
                      )}
                      <span>{vol.profile.total_tasks_completed} tasks</span>
                    </div>
                  </div>
                  {vol.profile.bio && (
                    <p className="text-xs text-slate-500 line-clamp-2">{vol.profile.bio}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">No profile set up yet</p>
              )}
            </motion.div>
          ))}

          {filtered.length === 0 && !loading && (
            <motion.div variants={item} className="col-span-full card text-center py-16">
              <Users size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">
                {search ? `No volunteers matching "${search}"` : 'No volunteers found'}
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-blue-400 text-sm mt-2 hover:text-blue-300 transition-colors"
                >
                  Clear search
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
