import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import toast from 'react-hot-toast'
import { MapPin, Users, AlertTriangle, Layers, ZoomIn, ZoomOut } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface Need {
  id: string
  title: string
  city: string
  country: string
  area: string
  category: string
  urgency: string
  status: string
  affected_people: number
  latitude: number | null
  longitude: number | null
  is_verified: boolean
}

const URGENCY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
}

const URGENCY_RADIUS: Record<string, number> = {
  critical: 18,
  high:     14,
  medium:   10,
  low:       7,
}

const FILTER_OPTIONS = ['all', 'critical', 'high', 'medium', 'low'] as const
type Filter = typeof FILTER_OPTIONS[number]

// Fit map to markers
function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length === 0) return
    if (coords.length === 1) {
      map.setView(coords[0], 8)
      return
    }
    const lats = coords.map(c => c[0])
    const lngs = coords.map(c => c[1])
    map.fitBounds([
      [Math.min(...lats) - 1, Math.min(...lngs) - 1],
      [Math.max(...lats) + 1, Math.max(...lngs) + 1],
    ], { padding: [40, 40] })
  }, [coords.length])
  return null
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function MapPage() {
  const { t } = useTranslation()
  const [needs, setNeeds] = useState<Need[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    api.get('/needs/', { params: { limit: 100 } })
      .then(r => setNeeds(r.data))
      .catch(() => toast.error('Failed to load needs'))
      .finally(() => setLoading(false))
  }, [])

  const geoNeeds = needs.filter(
    n => n.latitude !== null && n.longitude !== null
  )

  const filtered = filter === 'all'
    ? geoNeeds
    : geoNeeds.filter(n => n.urgency === filter)

  const coords: [number, number][] = filtered.map(n => [n.latitude!, n.longitude!])

  // Stats for the legend
  const counts = {
    critical: geoNeeds.filter(n => n.urgency === 'critical').length,
    high:     geoNeeds.filter(n => n.urgency === 'high').length,
    medium:   geoNeeds.filter(n => n.urgency === 'medium').length,
    low:      geoNeeds.filter(n => n.urgency === 'low').length,
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 h-full">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {t('map.title')}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t('map.subtitle')}</p>
        </div>

        {/* Urgency filter pills */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 capitalize ${
                filter === f
                  ? f === 'all'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : `border-transparent text-white`
                  : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-white'
              }`}
              style={
                filter === f && f !== 'all'
                  ? { backgroundColor: URGENCY_COLORS[f] + '33', borderColor: URGENCY_COLORS[f] + '66', color: URGENCY_COLORS[f] }
                  : {}
              }
            >
              {f === 'all' ? `All (${geoNeeds.length})` : `${f} (${counts[f as keyof typeof counts]})`}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Map + sidebar layout */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}>

        {/* Map */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-900">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            </div>
          ) : geoNeeds.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 gap-3">
              <MapPin size={40} className="text-slate-600" />
              <p className="text-slate-500 text-sm text-center max-w-xs">{t('map.noCoords')}</p>
            </div>
          ) : (
            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ width: '100%', height: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <FitBounds coords={coords} />
              {filtered.map(need => (
                <CircleMarker
                  key={need.id}
                  center={[need.latitude!, need.longitude!]}
                  radius={URGENCY_RADIUS[need.urgency] ?? 10}
                  pathOptions={{
                    color: URGENCY_COLORS[need.urgency] ?? '#94a3b8',
                    fillColor: URGENCY_COLORS[need.urgency] ?? '#94a3b8',
                    fillOpacity: 0.75,
                    weight: 2,
                  }}
                >
                  <Popup className="leaflet-popup-dark">
                    <div className="bg-slate-900 text-white rounded-xl p-3 min-w-[200px] border border-white/10 shadow-2xl">
                      <p className="font-bold text-sm mb-1">{need.title}</p>
                      <p className="text-xs text-slate-400 mb-2">
                        {need.area}, {need.city}{need.country ? `, ${need.country}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                          style={{
                            backgroundColor: URGENCY_COLORS[need.urgency] + '22',
                            color: URGENCY_COLORS[need.urgency],
                            border: `1px solid ${URGENCY_COLORS[need.urgency]}44`,
                          }}
                        >
                          {need.urgency}
                        </span>
                        <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full capitalize">
                          {need.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Users size={11} />
                        {need.affected_people.toLocaleString()} {t('map.affected').toLowerCase()}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}

          {/* Legend overlay */}
          {geoNeeds.length > 0 && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-xl">
              <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Layers size={12} /> Legend
              </p>
              {(['critical', 'high', 'medium', 'low'] as const).map(u => (
                <div key={u} className="flex items-center gap-2 mb-1 last:mb-0">
                  <div
                    className="rounded-full shrink-0"
                    style={{
                      width: URGENCY_RADIUS[u],
                      height: URGENCY_RADIUS[u],
                      backgroundColor: URGENCY_COLORS[u],
                      opacity: 0.85,
                    }}
                  />
                  <span className="text-xs text-slate-400 capitalize">{u}</span>
                  <span className="text-xs text-slate-600 ml-auto">{counts[u]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — list of mapped needs */}
        <div className="lg:col-span-1 flex flex-col gap-3 overflow-y-auto pr-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            {filtered.length} need{filtered.length !== 1 ? 's' : ''} shown
          </p>
          {filtered.length === 0 && (
            <div className="card text-center py-8">
              <AlertTriangle size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">No geo-located needs for this filter</p>
            </div>
          )}
          {filtered.map(need => (
            <motion.div
              key={need.id}
              whileHover={{ x: 2 }}
              className="card p-3 hover:border-white/20 transition-all duration-200 cursor-default"
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: URGENCY_COLORS[need.urgency] }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{need.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin size={9} />
                    {need.city}{need.country ? `, ${need.country}` : ''}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {need.affected_people.toLocaleString()} affected
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {needs.length > 0 && geoNeeds.length < needs.length && (
            <p className="text-xs text-slate-600 text-center px-2 pb-2">
              {needs.length - geoNeeds.length} need{needs.length - geoNeeds.length !== 1 ? 's' : ''} without coordinates not shown
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
