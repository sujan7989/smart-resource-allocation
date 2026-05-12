import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Smart Resource Allocation',
        short_name: 'SmartAlloc',
        description: 'Data-Driven Volunteer Coordination for Social Impact',
        theme_color: '#1d4ed8',
        background_color: '#1e3a8a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard - Smart Resource Allocation'
          },
          {
            src: 'screenshot-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Mobile View - Smart Resource Allocation'
          }
        ]
      },
      workbox: {
        // Cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Cache API dashboard stats for 5 minutes (offline fallback)
            urlPattern: /\/api\/dashboard\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-dashboard-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Cache community needs for 10 minutes
            urlPattern: /\/api\/needs\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-needs-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 10 // 10 minutes
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Cache tasks for 10 minutes
            urlPattern: /\/api\/tasks\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-tasks-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 10
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Cache field reports for offline viewing
            urlPattern: /\/api\/field-reports\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-reports-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 30 // 30 minutes
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: true // Enable PWA in dev mode for testing
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Code-split vendor libraries to reduce initial bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts':  ['recharts'],
          'vendor-motion':  ['framer-motion'],
          'vendor-ui':      ['lucide-react', 'clsx', 'react-hot-toast'],
          'vendor-state':   ['zustand', 'axios'],
          'vendor-map':     ['leaflet', 'react-leaflet'],
          'vendor-i18n':    ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
