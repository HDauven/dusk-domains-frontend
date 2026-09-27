import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

export function CopyValue({ value, label }: { value: string, label: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <button
      className="copy-value"
      type="button"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => setCopied(true), () => undefined)
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
