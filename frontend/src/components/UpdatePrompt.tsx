import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW registered:', r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-primary-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
        <RefreshCw size={20} className="shrink-0 text-primary-300" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Update Available</p>
          <p className="text-xs text-primary-300">A new version is ready</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setNeedRefresh(false)}
            className="text-xs text-primary-300 hover:text-white px-2 py-1"
          >
            Later
          </button>
          <button
            onClick={() => updateServiceWorker(true)}
            className="text-xs bg-primary-500 hover:bg-primary-400 px-3 py-1 rounded-lg font-medium"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  )
}
