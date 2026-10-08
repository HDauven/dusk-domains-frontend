import { BadgeCheck } from 'lucide-react'
import { isWebsiteVerification, type WebsiteVerification } from '../../names/http/verification'

export function WebsiteBadge({ verification, compact = false }: { verification?: WebsiteVerification; compact?: boolean }) {
  if (!isWebsiteVerification(verification) || verification.status !== 'verified') return null
  const label = `Verified · ${verification.domain}`
  return <span className="website-badge" title={label} aria-label={compact ? label : undefined}>
    <BadgeCheck size={16} aria-hidden="true" />
    {compact ? null : label}
  </span>
}
