/** FORGE — section rail label (JetBrains Mono, uppercase, muted) */
export default function SectionLabel({ children, className = '' }) {
  return (
    <div className={`mb-3 flex items-center gap-3 ${className}`.trim()}>
      <span className="forge-mono text-[9px] font-normal uppercase tracking-[0.1em] text-[rgba(255,255,255,0.12)]">
        {children}
      </span>
      <div className="h-px flex-1 bg-[rgba(220,60,80,0.06)]" />
    </div>
  )
}
