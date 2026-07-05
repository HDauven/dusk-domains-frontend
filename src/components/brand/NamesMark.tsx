export function NamesMark({ className = '' }: { className?: string }) {
  return (
    <span className={`names-mark ${className}`} aria-hidden="true">
      <img alt="" src="/dusk-domains-logo-dark.png" />
    </span>
  )
}

