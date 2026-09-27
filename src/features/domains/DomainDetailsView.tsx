import { ArrowUpRight } from 'lucide-react'
import { CopyValue } from '../../components/ui/CopyValue'
import {
  getRecordDefinition,
  type ActivityEntry,
  type ResolverRecord,
  type SubnameState,
} from '../../names/internal'
import { activityDetail, activityTitle } from '../activity/activityCopy'
import { activityWhen } from '../activity/activityTime'
import type { PrimaryVerificationSummary } from './details/primaryVerification'

// Records a sender needs, in the order a wallet would look for them.
const payableKeys = ['moonlight_address', 'phoenix_payment_endpoint', 'evm_address', 'dusk_contract', 'dusk_asset']
const hiddenKeys = new Set([...payableKeys, 'avatar'])

function safeLink(value: string) {
  return /^https:\/\//i.test(value) ? value : null
}

// A registered name's public profile: where to send, what it links to, and what changed lately.
export function DomainDetailsView({
  activityEntries,
  currentBlockHeight,
  displayName,
  formatActivityTime,
  onActivity,
  onManageRecords,
  onSubdomains,
  parentResolverRecords,
  primaryVerification,
  subnames,
  viewerAuthority,
}: {
  activityEntries: ActivityEntry[]
  currentBlockHeight: number | null
  displayName: string
  formatActivityTime: (timestamp: string) => string
  onActivity: () => void
  onManageRecords: () => void
  onSubdomains: () => void
  parentResolverRecords: ResolverRecord[]
  primaryVerification: PrimaryVerificationSummary
  subnames: SubnameState[]
  viewerAuthority: string
}) {
  const payable = payableKeys
    .map((key) => parentResolverRecords.find((record) => record.key === key))
    .filter((record): record is ResolverRecord => Boolean(record))
  const other = parentResolverRecords.filter((record) => !hiddenKeys.has(record.key))
  const labelOf = (record: ResolverRecord) => getRecordDefinition(record.key)?.label ?? record.key

  return (
    <div className="profile-grid">
      <section className="profile-card" aria-labelledby="send-heading">
        <div className="profile-card-head">
          <h2 id="send-heading">Send to {displayName}</h2>
        </div>
        {payable.length ? (
          <ul className="address-list">
            {payable.map((record) => (
              <li key={record.key}>
                <span>{labelOf(record)}</span>
                <code>{record.value}</code>
                <CopyValue value={record.value} label={labelOf(record)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="profile-empty">
            No addresses yet. Its owner can add them under <button type="button" onClick={onManageRecords}>Records</button>.
          </p>
        )}
        <p className={`primary-line ${primaryVerification.tone}`}>
          <strong>{primaryVerification.title}.</strong> {primaryVerification.description}
        </p>
      </section>

      <div className="profile-side">
        {other.length ? (
          <section className="profile-card" aria-labelledby="links-heading">
            <h2 id="links-heading">Links and records</h2>
            <ul className="link-list">
              {other.map((record) => {
                const href = safeLink(record.value)
                return (
                  <li key={record.key}>
                    <span>{labelOf(record)}</span>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer nofollow">
                        {record.value.replace(/^https:\/\//i, '').replace(/\/$/, '')} <ArrowUpRight size={14} />
                      </a>
                    ) : (
                      <code>{record.value}</code>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        <section className="profile-card" aria-labelledby="subnames-heading">
          <div className="profile-card-head">
            <h2 id="subnames-heading">Subnames</h2>
            <button className="text-button" type="button" onClick={onSubdomains}>Manage</button>
          </div>
          {subnames.length ? (
            <ul className="chip-list">
              {subnames.slice(0, 8).map((subname) => <li key={subname.node}>{subname.name}</li>)}
            </ul>
          ) : (
            <p className="profile-empty">None yet.</p>
          )}
        </section>

        <section className="profile-card" aria-labelledby="recent-heading">
          <div className="profile-card-head">
            <h2 id="recent-heading">Recent</h2>
            <button className="text-button" type="button" onClick={onActivity}>All activity</button>
          </div>
          {activityEntries.length ? (
            <ul className="recent-list">
              {activityEntries.slice(0, 4).map((entry) => (
                <li key={entry.id}>
                  <span>{activityTitle(entry)} <em>{activityDetail(entry, viewerAuthority)}</em></span>
                  <time>{activityWhen(entry.blockHeight, currentBlockHeight, entry.timestamp, formatActivityTime)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="profile-empty">No changes recorded yet.</p>
          )}
        </section>
      </div>
    </div>
  )
}
