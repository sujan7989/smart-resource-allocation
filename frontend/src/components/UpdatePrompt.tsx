import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(_r) {
      // Service worker registered successfully — no console noise in production
    },
    onRegisterError(_error) {
      // SW registration failed — silently ignore (app still works without SW)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-slate-900 border border-white/10 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
        <RefreshCw size={20} className="shrink-0 text-blue-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Update Available</p>
          <p className="text-xs text-slate-400">A new version is ready to install</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setNeedRefresh(false)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
          >
            Later
          </button>
          <button
            onClick={() => updateServiceWorker(true)}
            className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-lg font-medium transition-colors"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  )
}
