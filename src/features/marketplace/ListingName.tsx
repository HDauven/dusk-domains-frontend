import { BrandVerification } from '../search/BrandVerification'
import { WebsiteBadge } from '../../components/ui/WebsiteBadge'
import type { WebsiteVerification } from '../../names/internal'
import { NameAvatar } from '../../components/brand/NameAvatar'
import { NameSignature } from '../../components/ui/NameChip'

// A listing's name as the rest of the app shows names: avatar orb, display label, muted tld.
export function ListingName({ name, verification, size = 40, heading: Heading = 'h3', id }: { name: string, verification?: WebsiteVerification, size?: number, heading?: 'h1' | 'h2' | 'h3', id?: string }) {
  return (
    <div className="listing-name">
      <span className="listing-orb"><NameAvatar name={name} size={size} /></span>
      <div className="listing-identity">
        <Heading id={id} aria-label={name}><NameSignature name={name} fit /><WebsiteBadge verification={verification} compact /></Heading>
        <BrandVerification name={name} verification={verification} />
      </div>
    </div>
  )
}
