import { useState, useEffect } from 'react'

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!supported) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }

  const sendLocalNotification = (title: string, body: string, icon = '/pwa-192x192.png') => {
    if (permission !== 'granted') return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon,
          badge: '/pwa-64x64.png',
          tag: 'smart-alloc-notification',
        } as NotificationOptions)
      })
    }
  }

  return { permission, supported, requestPermission, sendLocalNotification }
}
