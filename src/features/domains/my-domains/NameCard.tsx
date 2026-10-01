import { NameCard as NamePortrait } from '../../../components/ui/NameCard'
import { Badge } from '../../../components/ui/Badge'
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
  const avatar = name.records.find((record) => record.key === 'avatar')?.value ?? null
  const description = name.records.find((record) => record.key === 'text.description')?.value
  const address = name.records.find((record) => record.key === 'moonlight_address')?.value ?? ''
  // A name keeps its records through a sale or transfer, so it can still pay the previous owner.
  const paysElsewhere = Boolean(address && selectedAddress && address !== selectedAddress)
  const life = nameCardLifecycle(name, currentBlockHeight)

  return (
    <NamePortrait name={name.canonicalName} avatar={avatar} description={description} onOpen={() => onOpen(name.canonicalName)}>
      <span className={`name-card-life ${life.tone}`}>{life.copy}</span>
      <span className="name-card-tags">
        {isOwnPrimary(primary, paysElsewhere) ? <Badge tone="success">Primary name</Badge> : null}
        {address ? null : <Badge tone="warning">No address</Badge>}
        {paysElsewhere ? <Badge tone="warning">Pays another wallet</Badge> : null}
        {name.subnameCount ? <Badge tone="neutral">{name.subnameCount} {pluralize(name.subnameCount, 'subname')}</Badge> : null}
      </span>
    </NamePortrait>
  )
}
