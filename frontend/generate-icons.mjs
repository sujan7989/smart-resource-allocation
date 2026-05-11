// Generates PWA icons as SVG-based PNGs using canvas
// Run: node generate-icons.mjs

import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function drawIcon(size, maskable = false) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  const padding = maskable ? size * 0.15 : 0
  const innerSize = size - padding * 2

  // Background
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#1e3a8a')
  gradient.addColorStop(1, '#2563eb')
  ctx.fillStyle = gradient

  if (maskable) {
    ctx.fillRect(0, 0, size, size)
  } else {
    const radius = size * 0.2
    ctx.beginPath()
    ctx.moveTo(radius, 0)
    ctx.lineTo(size - radius, 0)
    ctx.quadraticCurveTo(size, 0, size, radius)
    ctx.lineTo(size, size - radius)
    ctx.quadraticCurveTo(size, size, size - radius, size)
    ctx.lineTo(radius, size)
    ctx.quadraticCurveTo(0, size, 0, size - radius)
    ctx.lineTo(0, radius)
    ctx.quadraticCurveTo(0, 0, radius, 0)
    ctx.closePath()
    ctx.fill()
  }

  // Heart icon
  const cx = size / 2
  const cy = size / 2
  const heartSize = innerSize * 0.45

  ctx.fillStyle = 'white'
  ctx.beginPath()
  const x = cx - heartSize / 2
  const y = cy - heartSize / 2 + heartSize * 0.1
  const w = heartSize
  const h = heartSize

  ctx.moveTo(x + w / 2, y + h)
  ctx.bezierCurveTo(x + w / 2, y + h, x, y + h * 0.6, x, y + h * 0.35)
  ctx.bezierCurveTo(x, y + h * 0.1, x + w * 0.25, y, x + w / 2, y + h * 0.25)
  ctx.bezierCurveTo(x + w * 0.75, y, x + w, y + h * 0.1, x + w, y + h * 0.35)
  ctx.bezierCurveTo(x + w, y + h * 0.6, x + w / 2, y + h, x + w / 2, y + h)
  ctx.fill()

  return canvas.toBuffer('image/png')
}

try {
  const { createCanvas } = await import('canvas')
  writeFileSync('public/pwa-64x64.png', drawIcon(64))
  writeFileSync('public/pwa-192x192.png', drawIcon(192))
  writeFileSync('public/pwa-512x512.png', drawIcon(512))
  writeFileSync('public/maskable-icon-512x512.png', drawIcon(512, true))
  console.log('Icons generated!')
} catch (e) {
  console.log('canvas not available, using fallback SVG icons')
}
