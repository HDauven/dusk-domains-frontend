import { NameAvatar } from '../../components/brand/NameAvatar'

// A listing's name as the rest of the app shows names: avatar orb, display label, muted tld.
export function ListingName({ name, size = 40, heading: Heading = 'h3' }: { name: string, size?: number, heading?: 'h2' | 'h3' }) {
  const label = name.replace(/\.dusk$/, '')
  return (
    <div className="listing-name">
      <span className="listing-orb"><NameAvatar name={label} size={size} /></span>
      <Heading>{label}<span>{name.endsWith('.dusk') ? '.dusk' : ''}</span></Heading>
    </div>
  )
}
