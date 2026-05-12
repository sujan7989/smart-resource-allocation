import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Already installed as PWA — don't show prompt
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios)

    // Android / Desktop: capture the native install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShowPrompt(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: show manual instructions after 5s (only once per session)
    if (ios && !localStorage.getItem('pwa-ios-dismissed')) {
      setTimeout(() => setShowPrompt(true), 5000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setIsInstalled(true)
    } catch {
      // Browser rejected the prompt call — silently ignore
    } finally {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    if (isIOS) localStorage.setItem('pwa-ios-dismissed', '1')
  }

  if (!showPrompt || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-600 rounded-xl p-2 shrink-0">
            <Smartphone size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm">Install App</p>
            {isIOS ? (
              <p className="text-xs text-slate-400 mt-1">
                Tap <strong className="text-slate-300">Share</strong> →{' '}
                <strong className="text-slate-300">"Add to Home Screen"</strong> to install on your iPhone
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                Install <strong className="text-slate-300">SmartAlloc</strong> for quick access — works offline too
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-white transition-colors shrink-0"
            aria-label="Dismiss install prompt"
          >
            <X size={18} />
          </button>
        </div>

        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 text-sm text-slate-400 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 text-sm bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <Download size={14} /> Install
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
