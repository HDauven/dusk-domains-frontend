import { Sparkles } from 'lucide-react'
import { NameAvatar } from '../../components/brand/NameAvatar'
import type { NameStatus, ResolverRecord } from '../../names/internal'
import { statusCopy } from '../domains/domainFormat'

function splitName(displayName: string) {
  return displayName.endsWith('.dusk')
    ? { label: displayName.slice(0, -'.dusk'.length), tld: '.dusk' }
    : { label: displayName, tld: '' }
}

const statusTone: Record<NameStatus, string> = {
  available: 'ok',
  registered: '',
  reserved: 'warn',
  invalid: 'danger',
}

export function NameHeader({
  displayName,
  expiresLabel,
  primaryVerified,
  records,
  reserved,
  status,
}: {
  displayName: string
  expiresLabel: string | null
  primaryVerified: boolean
  records: ResolverRecord[]
  reserved: boolean
  status: NameStatus
}) {
  const { label, tld } = splitName(displayName)
  const avatar = records.find((record) => record.key === 'avatar')?.value ?? null
  const registered = status === 'registered'

  return (
    <header className={`name-hero ${status}`}>
      <div className={registered ? 'name-hero-orb' : 'name-hero-orb unclaimed'}>
        {registered ? (
          <NameAvatar name={label} src={avatar} size={96} />
        ) : (
          <Sparkles size={30} aria-hidden="true" />
        )}
      </div>
      <div className="name-hero-copy">
        <h1 className="name-hero-title">
          {label}<span>{tld}</span>
        </h1>
        <div className="name-hero-badges">
          {reserved ? (
            <span className="status-badge dusk">Registration saved</span>
          ) : (
            <span className={`status-badge ${statusTone[status]}`}>{statusCopy(status)}</span>
          )}
          {registered && primaryVerified ? <span className="status-badge ok">Primary name</span> : null}
          {registered && expiresLabel ? <span className="status-badge">Renews by {expiresLabel}</span> : null}
        </div>
      </div>
    </header>
  )
}
