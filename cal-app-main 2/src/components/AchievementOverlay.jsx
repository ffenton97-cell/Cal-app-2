import { useEffect, useState } from 'react'

export default function AchievementOverlay({ achievement, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!achievement) return
    setVisible(true)
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, 2800)
    return () => clearTimeout(t)
  }, [achievement])

  if (!achievement) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/75
        transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={() => { setVisible(false); setTimeout(onDone, 300) }}
    >
      <div
        className="realm-banner flex flex-col items-center gap-3 text-center px-8 py-10 shadow-2xl max-w-xs mx-4 rounded-lg realm-glow-gold"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl drop-shadow-lg">{achievement.icon}</div>
        <p className="ff-heading text-[11px] uppercase tracking-[0.2em] text-realm-gold">
          Boon earned
        </p>
        <h2 className="ff-heading text-xl font-bold text-realm-text">{achievement.label}</h2>
        <p className="ff-mono text-[12px] text-realm-muted">{achievement.desc}</p>
        <p className="ff-mono text-[14px] font-semibold text-realm-gold-hot">+{achievement.xp} XP</p>
      </div>
    </div>
  )
}
