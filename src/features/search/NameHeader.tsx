import { BrandVerification } from './BrandVerification'
import { isWebsiteVerification } from '../../names/http/verification'
import { WebsiteBadge } from '../../components/ui/WebsiteBadge'
import type { WebsiteVerification } from '../../names/internal'
import { Badge } from '../../components/ui/Badge'
import { NameAvatar } from '../../components/brand/NameAvatar'
import { NameSignature } from '../../components/ui/NameChip'
import { OwnerLabel } from '../identity/OwnerLabel'
import { sameAuthority } from '../identity/ownerLabel'
import type { NameStatus, ResolverRecord } from '../../names/internal'
import { statusCopy } from '../domains/domainFormat'
import { followLink, navigateTo, routePath } from '../../app/routes'
import type { NameListingOffer } from '../marketplace/nameListing'

const offerRoute = (offerName: string) => ({ view: 'marketplace' as const, offerName })

export function NameHeader({ canMakeOffer = false, heldByMarket = false, listing = null, displayName, verification, lifecycleLabel, lifecycleNote, primaryVerified, owner, manager = null, records, reserved, status, viewerAuthority, ownerAddresses = [] }: {
  canMakeOffer?: boolean
  /** The market holds the name while it is listed. */
  heldByMarket?: boolean
  /** Its price and where to buy or bid, while listed. */
  listing?: NameListingOffer | null
  /** What the expiry date means, next to it. */
  lifecycleNote?: string | null
  verification?: WebsiteVerification
  displayName: string
  lifecycleLabel: string | null
  primaryVerified: boolean
  owner?: string | null
  /** Shown beside the owner when another account manages the name. */
  manager?: string | null
  records: ResolverRecord[]
  reserved: boolean
  status: NameStatus
  ownerAddresses?: string[]
  viewerAuthority?: string
}) {
  const registered = status === 'registered'
  const websiteVerified = isWebsiteVerification(verification) && verification.status === 'verified'
  const avatar = records.find(record => record.key === 'avatar')?.value
  const description = records.find(record => record.key === 'text.description')?.value
  const addresses = [...ownerAddresses, ...records.filter(record => record.key === 'moonlight_address').map(record => record.value)]
  const separateManager = Boolean(owner && manager && !sameAuthority(owner, manager))
  return <header className={`name-hero ${status}`}>
    {registered && avatar ? <NameAvatar key={avatar} name={displayName} src={avatar} size={48} /> : null}
    <div className="name-hero-identity">
      <h1 className="name-hero-title" aria-label={displayName}><NameSignature name={displayName} fit /></h1>
      {registered && description ? <p className="name-hero-description">{description}</p> : null}
    </div>
    <div className="name-hero-copy">
      {registered && heldByMarket ? <div className="name-hero-owner">Held by the market while listed</div> : registered && owner ? <>
        <div className="name-hero-owner">Owner <OwnerLabel authority={owner} viewerAuthority={viewerAuthority} addresses={addresses} /></div>
        {separateManager ? <div className="name-hero-owner">Manager <OwnerLabel authority={manager!} viewerAuthority={viewerAuthority} addresses={addresses} /></div> : null}
      </> : null}
      <div className="name-hero-badges">
        {registered && websiteVerified ? <WebsiteBadge verification={verification} /> : null}
        {reserved ? <Badge status="reserved">Reserved</Badge> : !registered ? <Badge>{statusCopy(status)}</Badge> : null}
        {registered ? <BrandVerification name={displayName} verification={verification} explain /> : null}
        {registered && primaryVerified ? <Badge tone="success">Primary name</Badge> : null}
        {registered && lifecycleLabel ? <Badge>{lifecycleLabel}</Badge> : null}
      </div>
      {registered && lifecycleLabel && lifecycleNote ? <p className="name-hero-note">{lifecycleNote}</p> : null}
      {registered && listing ? <div className="name-hero-listing">
        <strong>{listing.text}</strong>
        <a className="button button-primary compact" href={routePath(listing.route)} onClick={event => followLink(event, () => navigateTo(listing.route))}>{listing.linkLabel}</a>
      </div> : null}
      {canMakeOffer ? <a className="button button-secondary compact name-hero-offer" href={routePath(offerRoute(displayName))}
        onClick={event => followLink(event, () => navigateTo(offerRoute(displayName)))}>Make an offer</a> : null}
    </div>
  </header>
}
