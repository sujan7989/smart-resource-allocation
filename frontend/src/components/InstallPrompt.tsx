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
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Detect iOS
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios)

    // Android / Desktop install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Show iOS instructions after 5 seconds
    if (ios && !localStorage.getItem('pwa-ios-dismissed')) {
      setTimeout(() => setShowPrompt(true), 5000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    if (isIOS) localStorage.setItem('pwa-ios-dismissed', '1')
  }

  if (!showPrompt || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary-600 rounded-xl p-2 shrink-0">
            <Smartphone size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">Install App</p>
            {isIOS ? (
              <p className="text-xs text-gray-500 mt-1">
                Tap <strong>Share</strong> → <strong>"Add to Home Screen"</strong> to install this app on your iPhone
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Install <strong>Smart Resource Allocation</strong> on your device for quick access — works offline too
              </p>
            )}
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={18} />
          </button>
        </div>

        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 text-sm text-gray-500 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 text-sm bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center gap-1"
            >
              <Download size={14} /> Install
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
