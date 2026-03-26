export default function SectionLabel({ children, className = '' }) {
  return (
    <div className={`mb-2 flex items-center gap-3 ${className}`.trim()}>
      <span className="ios-label">{children}</span>
      <div className="h-px flex-1 bg-[rgba(220,60,80,0.08)]" />
    </div>
  )
}
