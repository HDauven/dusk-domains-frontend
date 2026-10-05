export function NamesMark({ className = '' }: { className?: string }) {
  return (
    <span className={`names-mark ${className}`} aria-hidden="true">
      <img alt="" src="/favicon.svg" width={32} height={32} />
    </span>
  )
}

