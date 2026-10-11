import { NameCard as NamePortrait } from '../../../components/ui/NameCard'
import { Badge } from '../../../components/ui/Badge'
import { navigateTo } from '../../../app/routes'
import type { HeldListing, HeldSubname } from '../myDomainsData'
import { listingRoute, listingStatus, subnameExpiry } from './heldStatus'

export function ListingCard({ item, currentBlockHeight }: { item: HeldListing, currentBlockHeight: number | null }) {
  return <NamePortrait name={item.name} verification={item.listing.verification} openLabel={`Open the listing for ${item.name}`} onOpen={() => navigateTo(listingRoute(item))}>
    <span className="name-card-life">{listingStatus(item, currentBlockHeight)}</span>
    <span className="name-card-tags"><Badge tone="neutral">Held by the market</Badge></span>
  </NamePortrait>
}

export function SubnameCard({ item, currentBlockHeight, onOpen }: { item: HeldSubname, currentBlockHeight: number | null, onOpen: (name: string) => void }) {
  const expiry = subnameExpiry(item, currentBlockHeight)
  return <NamePortrait name={item.name} onOpen={() => onOpen(item.name)}>
    {expiry ? <span className="name-card-life">{expiry}</span> : null}
    <span className="name-card-tags">
      <Badge tone="neutral">{item.role === 'owner' ? 'Owner' : 'Manager'}</Badge>
      <span className="name-card-parent">Under {item.parentName}</span>
    </span>
  </NamePortrait>
}
