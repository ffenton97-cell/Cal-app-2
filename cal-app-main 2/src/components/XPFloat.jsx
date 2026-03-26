import { useEffect, useState, useRef } from 'react'

// Particle directions fanned from center-right
const PARTICLES = [
  { dx: -1.2, dy: -2.2 },
  { dx:  0.1, dy: -2.5 },
  { dx:  1.3, dy: -2.0 },
  { dx: -2.0, dy: -1.2 },
  { dx:  2.0, dy: -1.0 },
  { dx: -1.5, dy:  0.4 },
  { dx:  1.8, dy:  0.2 },
  { dx:  0.0, dy: -3.0 },
]

export default function XPFloat({ amount, onDone }) {
  const [phase, setPhase] = useState('in')   // 'in' | 'out'
  const done = useRef(false)
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 900)
    const t2 = setTimeout(() => {
      if (!done.current) { done.current = true; onDoneRef.current() }
    }, 1300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div
      className="fixed z-[90] pointer-events-none"
      style={{ top: 52, right: 16 }}
    >
      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: '#deb566',
            top: '50%',
            left: '50%',
            opacity:   phase === 'in' ? 0.9 : 0,
            transform: phase === 'in'
              ? `translate(-50%, -50%)`
              : `translate(calc(-50% + ${p.dx * 22}px), calc(-50% + ${p.dy * 22}px))`,
            transition: `transform 0.6s cubic-bezier(0.22,0.61,0.36,1) ${i * 25}ms,
                         opacity 0.4s ease ${0.4 + i * 15}ms`,
          }}
        />
      ))}

      {/* Label */}
      <span
        className="ff-mono text-[15px] font-semibold text-realm-gold block whitespace-nowrap"
        style={{
          opacity:   phase === 'in' ? 1 : 0,
          transform: phase === 'in' ? 'translateY(0)' : 'translateY(-16px)',
          transition: 'transform 0.4s ease, opacity 0.35s ease',
          textShadow: '0 0 14px rgba(222, 181, 102, 0.45)',
        }}
      >
        +{amount} XP
      </span>
    </div>
  )
}
