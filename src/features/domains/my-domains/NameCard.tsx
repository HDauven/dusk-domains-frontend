import { NameAvatar } from '../../../components/brand/NameAvatar'
import { DUSK_APPROX_BLOCK_TIME_SECONDS, type IndexedNameSummary } from '../../../names/internal'
import { pluralize } from '../../../utils/format'
import { formatLifecycleDay } from '../domainFormat'
import type { MyNamePrimarySummary } from '../MyDomainsView'

const SOON_SECONDS = 30 * 24 * 60 * 60

// Lifecycle from block heights; the indexer's dates are estimates and have been wrong before.
function lifecycle(name: IndexedNameSummary, currentBlockHeight: number | null) {
  const expiresAt = name.expiresAtBlockHeight
  const graceEndsAt = name.graceEndsAtBlockHeight ?? expiresAt
  if (expiresAt == null || graceEndsAt == null) return { tone: '', copy: name.expiresAt ? `Renews by ${name.expiresAt.slice(0, 10)}` : '' }
  const nowSeconds = Math.floor(Date.now() / 1000)
  const expires = formatLifecycleDay(expiresAt, currentBlockHeight, nowSeconds)
  if (currentBlockHeight === null) return { tone: '', copy: `Renews by ${expires}` }
  if (currentBlockHeight >= graceEndsAt) return { tone: 'danger', copy: `Expired ${expires}` }
  if (currentBlockHeight >= expiresAt) {
    return { tone: 'danger', copy: `Expired. Renew by ${formatLifecycleDay(graceEndsAt, currentBlockHeight, nowSeconds)} to keep it` }
  }
  const left = (expiresAt - currentBlockHeight) * DUSK_APPROX_BLOCK_TIME_SECONDS
  return left < SOON_SECONDS ? { tone: 'warn', copy: `Renew soon: ends ${expires}` } : { tone: '', copy: `Renews by ${expires}` }
}

export function NameCard({
  currentBlockHeight,
  name,
  onOpen,
  primary,
}: {
  currentBlockHeight: number | null
  name: IndexedNameSummary
  onOpen: (name: string) => void
  primary: MyNamePrimarySummary | undefined
}) {
  const label = name.canonicalName.replace(/\.dusk$/, '')
  const avatar = name.records.find((record) => record.key === 'avatar')?.value ?? null
  const hasAddress = name.records.some((record) => record.key === 'moonlight_address')
  const life = lifecycle(name, currentBlockHeight)

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
        {primary?.tone === 'success' ? <span className="status-badge ok">Primary name</span> : null}
        {hasAddress ? null : <span className="status-badge warn">No address</span>}
        {name.subnameCount ? <span className="status-badge">{name.subnameCount} {pluralize(name.subnameCount, 'subname')}</span> : null}
      </span>
    </button>
  )
}
