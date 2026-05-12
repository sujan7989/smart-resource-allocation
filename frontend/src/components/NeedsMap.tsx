import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

interface Need {
  id: string
  title: string
  city: string
  country: string
  urgency: string
  affected_people: number
  status: string
  latitude?: number | null
  longitude?: number | null
}

interface NeedsMapProps {
  needs: Need[]
}

const URGENCY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

// Approximate city coordinates for needs without lat/lng
const CITY_COORDS: Record<string, [number, number]> = {
  mumbai: [19.076, 72.877],
  delhi: [28.613, 77.209],
  bangalore: [12.972, 77.594],
  chennai: [13.083, 80.270],
  kolkata: [22.572, 88.363],
  hyderabad: [17.385, 78.486],
  pune: [18.520, 73.856],
  lagos: [6.524, 3.379],
  nairobi: [1.286, 36.817],
  cairo: [30.044, 31.235],
  'new york': [40.712, -74.006],
  london: [51.507, -0.127],
  paris: [48.856, 2.352],
  tokyo: [35.689, 139.692],
  sydney: [-33.868, 151.209],
  'são paulo': [-23.550, -46.633],
  'sao paulo': [-23.550, -46.633],
  mexico: [19.432, -99.133],
  jakarta: [-6.208, 106.845],
  dhaka: [23.810, 90.412],
  karachi: [24.860, 67.010],
}

function getCoords(need: Need): [number, number] | null {
  if (need.latitude && need.longitude) return [need.latitude, need.longitude]
  const key = need.city.toLowerCase()
  return CITY_COORDS[key] || null
}

export default function NeedsMap({ needs }: NeedsMapProps) {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then(L => {
      // Fix default icon paths broken by bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Destroy existing map instance before re-creating
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const map = L.map(containerRef.current!, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: true,
      })

      mapRef.current = map

      // Dark tile layer matching the app theme
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map)

      // Add markers for each need that has coordinates
      const markers: any[] = []
      needs.forEach(need => {
        const coords = getCoords(need)
        if (!coords) return

        const color = URGENCY_COLORS[need.urgency] || '#94a3b8'

        // Custom circle marker
        const marker = L.circleMarker(coords, {
          radius: Math.min(8 + Math.log10(need.affected_people + 1) * 3, 20),
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.6,
        })

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 180px;">
            <p style="font-weight: 700; font-size: 13px; margin: 0 0 4px; color: #f1f5f9;">${need.title}</p>
            <p style="font-size: 11px; color: #94a3b8; margin: 0 0 6px;">${need.city}${need.country ? ', ' + need.country : ''}</p>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <span style="background: ${color}22; color: ${color}; border: 1px solid ${color}44; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px; text-transform: capitalize;">${need.urgency}</span>
              <span style="font-size: 11px; color: #64748b;">${need.affected_people.toLocaleString()} affected</span>
            </div>
          </div>
        `, {
          className: 'leaflet-dark-popup',
          maxWidth: 240,
        })

        marker.addTo(map)
        markers.push(marker)
      })

      // Fit map to markers if any exist
      if (markers.length > 0) {
        const group = L.featureGroup(markers)
        map.fitBounds(group.getBounds().pad(0.2))
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [needs])

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex flex-col gap-1.5">
        {Object.entries(URGENCY_COLORS).map(([level, color]) => (
          <div key={level} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-xs text-slate-400 capitalize">{level}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
