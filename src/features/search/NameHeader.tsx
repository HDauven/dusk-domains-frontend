import { Badge } from '../../components/ui/Badge'
import { NameCard } from '../../components/ui/NameCard'
import { NameSignature } from '../../components/ui/NameChip'
import { OwnerLabel } from '../identity/OwnerLabel'
import type { NameStatus, ResolverRecord } from '../../names/internal'
import { statusCopy } from '../domains/domainFormat'

export function NameHeader({ displayName, lifecycleLabel, primaryVerified, owner, records, reserved, status, viewerAuthority, ownerAddresses = [] }: {
  displayName: string
  lifecycleLabel: string | null
  primaryVerified: boolean
  owner?: string | null
  records: ResolverRecord[]
  reserved: boolean
  status: NameStatus
  ownerAddresses?: string[]
  viewerAuthority?: string
}) {
  const registered = status === 'registered'
  const avatar = records.find(record => record.key === 'avatar')?.value
  const description = records.find(record => record.key === 'text.description')?.value
  return <header className={`name-hero ${status}`}>
    {registered ? <h1 className="name-page-heading">{displayName}</h1> : null}
    {registered ? <NameCard name={displayName} avatar={avatar} description={description} /> : <h1 className="name-hero-title" aria-label={displayName}><NameSignature name={displayName} fit /></h1>}
    <div className="name-hero-copy">
      {registered && owner ? <div className="name-hero-owner">Owner <OwnerLabel authority={owner} viewerAuthority={viewerAuthority} addresses={[...ownerAddresses, ...records.filter(record => record.key === 'moonlight_address').map(record => record.value)]} /></div> : null}
      <div className="name-hero-badges">
        {reserved ? <Badge status="reserved">Reserved</Badge> : !registered ? <Badge>{statusCopy(status)}</Badge> : null}
        {registered && primaryVerified ? <Badge tone="success">Primary name</Badge> : null}
        {registered && lifecycleLabel ? <Badge>{lifecycleLabel}</Badge> : null}
      </div>
    </div>
  </header>
}
