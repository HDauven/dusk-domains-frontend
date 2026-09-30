import { NameAvatar } from '../../../components/brand/NameAvatar'
import type { IndexedNameSummary } from '../../../names/internal'
import { pluralize } from '../../../utils/format'
import type { MyNamePrimarySummary } from '../MyDomainsView'
import { nameCardLifecycle } from './nameCardLifecycle'

// Verified primary for the address the name points to; it is only yours when that address is.
function isOwnPrimary(primary: MyNamePrimarySummary | undefined, paysElsewhere: boolean) {
  return primary?.tone === 'success' && !paysElsewhere
}

export function NameCard({
  currentBlockHeight,
  name,
  onOpen,
  primary,
  selectedAddress,
}: {
  currentBlockHeight: number | null
  name: IndexedNameSummary
  onOpen: (name: string) => void
  primary: MyNamePrimarySummary | undefined
  selectedAddress: string
}) {
  const label = name.canonicalName.replace(/\.dusk$/, '')
  const avatar = name.records.find((record) => record.key === 'avatar')?.value ?? null
  const address = name.records.find((record) => record.key === 'moonlight_address')?.value ?? ''
  // A name keeps its records through a sale or transfer, so it can still pay the previous owner.
  const paysElsewhere = Boolean(address && selectedAddress && address !== selectedAddress)
  const life = nameCardLifecycle(name, currentBlockHeight)

  return (
    <button className="name-card" type="button" onClick={() => onOpen(name.canonicalName)}>
      <span className="name-card-orb">
        <NameAvatar name={label} src={avatar} size={52} />
      </span>
      <span className="name-card-name">
        {label}<span>.dusk</span>
      </span>
      <span className={`name-card-life ${life.tone}`}>{life.copy}</span>
      <span className="name-card-tags">
        {isOwnPrimary(primary, paysElsewhere) ? <span className="status-badge ok">Primary name</span> : null}
        {address ? null : <span className="status-badge warn">No address</span>}
        {paysElsewhere ? <span className="status-badge warn">Pays another wallet</span> : null}
        {name.subnameCount ? <span className="status-badge">{name.subnameCount} {pluralize(name.subnameCount, 'subname')}</span> : null}
      </span>
    </button>
  )
}
