import { Sparkles } from 'lucide-react'
import { AddressChip } from '../../components/ui/AddressChip'
import { Badge } from '../../components/ui/Badge'
import { NameAvatar } from '../../components/brand/NameAvatar'
import type { NameStatus, ResolverRecord } from '../../names/internal'
import { statusCopy } from '../domains/domainFormat'

function splitName(displayName: string) {
  return displayName.endsWith('.dusk')
    ? { label: displayName.slice(0, -'.dusk'.length), tld: '.dusk' }
    : { label: displayName, tld: '' }
}

export function NameHeader({
  displayName,
  lifecycleLabel,
  primaryVerified,
  owner,
  records,
  reserved,
  status,
}: {
  displayName: string
  lifecycleLabel: string | null
  primaryVerified: boolean
  owner?: string | null
  records: ResolverRecord[]
  reserved: boolean
  status: NameStatus
}) {
  const { label, tld } = splitName(displayName)
  const avatar = records.find((record) => record.key === 'avatar')?.value ?? null
  const description = records.find((record) => record.key === 'text.description')?.value
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
        {registered && description ? <p className="name-hero-description">{description}</p> : null}
        {registered && owner ? <div className="name-hero-owner">Owner <AddressChip value={owner} label="owner address" /></div> : null}
        <div className="name-hero-badges">
          {reserved ? (
            <Badge status="reserved">Registration saved</Badge>
          ) : (
            <Badge status={status === 'invalid' ? undefined : status === 'registered' ? 'taken' : status} tone="danger">{status === 'registered' ? 'Taken' : statusCopy(status)}</Badge>
          )}
          {registered && primaryVerified ? <Badge tone="success">Primary name</Badge> : null}
          {registered && lifecycleLabel ? <Badge>{lifecycleLabel}</Badge> : null}
        </div>
      </div>
    </header>
  )
}
