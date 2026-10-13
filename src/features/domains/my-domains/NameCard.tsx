import { NameCard as NamePortrait } from '../../../components/ui/NameCard'
import { Badge } from '../../../components/ui/Badge'
import type { IndexedNameSummary } from '../../../names/internal'
import { pluralize } from '../../../utils/format'
import type { MyNamePrimarySummary } from '../MyDomainsView'
import { nameCardLifecycle } from './nameCardLifecycle'
import { indexedPrimaryIsActive } from '../indexedPrimary'
import { addressRecordIssue } from '../recordPresentation'

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
  const addressRecord = name.records.find((record) => record.key === 'moonlight_address')
  // An invalid address is never treated as where the name pays.
  const invalidAddress = Boolean(addressRecord && addressRecordIssue(addressRecord))
  const address = addressRecord && !invalidAddress ? addressRecord.value : ''
  // A name keeps its records through a sale or transfer, so it can still pay the previous owner.
  const paysElsewhere = Boolean(address && selectedAddress && address !== selectedAddress)
  const life = nameCardLifecycle(name, currentBlockHeight)

  return (
    <NamePortrait verification={name.verification} name={name.canonicalName} avatar={avatar} description={description} onOpen={() => onOpen(name.canonicalName)}>
      <span className={`name-card-life ${life.tone}`}>{life.copy}</span>
      <span className="name-card-tags">
        {primary?.tone === 'success' && address === selectedAddress && indexedPrimaryIsActive(name, currentBlockHeight) ? <Badge tone="success">Primary name</Badge> : null}
        {invalidAddress ? <Badge tone="warning">Invalid address</Badge> : address ? null : <Badge tone="warning">No address</Badge>}
        {paysElsewhere ? <Badge tone="warning">Pays another wallet</Badge> : null}
        {name.subnameCount ? <Badge tone="neutral">{name.subnameCount} {pluralize(name.subnameCount, 'subname')}</Badge> : null}
      </span>
    </NamePortrait>
  )
}
