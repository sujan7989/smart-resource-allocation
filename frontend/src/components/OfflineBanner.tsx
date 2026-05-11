import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      setTimeout(() => setShowReconnected(false), 3000)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showReconnected) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all ${
      isOnline
        ? 'bg-green-500 text-white'
        : 'bg-gray-800 text-white'
    }`}>
      {isOnline ? (
        <><Wifi size={16} /> Back online — syncing data...</>
      ) : (
        <><WifiOff size={16} /> You're offline — showing cached data</>
      )}
    </div>
  )
}
