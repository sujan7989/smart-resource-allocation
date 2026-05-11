import { motion } from 'framer-motion'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  animate?: boolean
}

export default function Logo({ size = 'md', showText = true, animate = true }: LogoProps) {
  const sizes = {
    sm: { icon: 28, text: 'text-sm', sub: 'text-xs' },
    md: { icon: 36, text: 'text-base', sub: 'text-xs' },
    lg: { icon: 52, text: 'text-xl', sub: 'text-sm' },
  }
  const s = sizes[size]

  const IconWrapper = animate ? motion.div : 'div'
  const iconProps = animate ? {
    whileHover: { rotate: [0, -10, 10, 0], scale: 1.1 },
    transition: { duration: 0.5 }
  } : {}

  return (
    <div className="flex items-center gap-3">
      <IconWrapper {...iconProps}>
        <div
          className="relative flex items-center justify-center rounded-2xl"
          style={{
            width: s.icon + 12,
            height: s.icon + 12,
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            boxShadow: '0 0 20px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
          }}
        >
          {/* Animated ring */}
          {animate && (
            <div
              className="absolute inset-0 rounded-2xl animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))' }}
            />
          )}
          {/* Heart SVG */}
          <svg
            width={s.icon * 0.55}
            height={s.icon * 0.55}
            viewBox="0 0 24 24"
            fill="none"
            className="relative z-10"
          >
            <path
              d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"
              fill="white"
              opacity="0.95"
            />
            {/* Network dots on heart */}
            <circle cx="8" cy="10" r="1.2" fill="rgba(147,197,253,0.8)" />
            <circle cx="12" cy="8" r="1.2" fill="rgba(147,197,253,0.8)" />
            <circle cx="16" cy="10" r="1.2" fill="rgba(147,197,253,0.8)" />
            <line x1="8" y1="10" x2="12" y2="8" stroke="rgba(147,197,253,0.6)" strokeWidth="0.8" />
            <line x1="12" y1="8" x2="16" y2="10" stroke="rgba(147,197,253,0.6)" strokeWidth="0.8" />
          </svg>
        </div>
      </IconWrapper>

      {showText && (
        <div>
          <p className={`font-bold leading-tight text-white ${s.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Smart<span className="text-gradient"> Resource</span>
          </p>
          <p className={`text-slate-400 leading-tight ${s.sub}`}>Allocation Platform</p>
        </div>
      )}
    </div>
  )
}
