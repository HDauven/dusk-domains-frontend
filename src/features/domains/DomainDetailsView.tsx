import { Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { ArrowUpRight } from 'lucide-react'
import { AddressChip } from '../../components/ui/AddressChip'
import { NameChip } from '../../components/ui/NameChip'
import { EmptyState } from '../../components/ui/EmptyState'
import { abbreviate } from '../../utils/format'
import {
  type ActivityEntry,
  type ResolverRecord,
  type SubnameState,
} from '../../names/internal'
import { activityDetail, activityTitle } from '../activity/activityCopy'
import { activityWhen } from '../activity/activityTime'
import type { PrimaryVerificationSummary } from './details/primaryVerification'
import { isIdentifierRecord, recordLabel } from './recordPresentation'

// Records a sender needs, in the order a wallet would look for them.
const payableKeys = ['moonlight_address', 'phoenix_payment_endpoint', 'evm_address', 'dusk_contract', 'dusk_asset']
const hiddenKeys = new Set(payableKeys)

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
  paysPreviousOwner,
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
  // Set when the viewer owns the name but it still pays another address, e.g. after a transfer.
  paysPreviousOwner: string | null
  primaryVerification: PrimaryVerificationSummary
  subnames: SubnameState[]
  viewerAuthority: string
}) {
  const payable = payableKeys
    .map((key) => parentResolverRecords.find((record) => record.key === key))
    .filter((record): record is ResolverRecord => Boolean(record))
  const other = parentResolverRecords.filter((record) => !hiddenKeys.has(record.key))

  return (
    <div className="profile-grid">
      <Panel className="profile-card" aria-labelledby="send-heading">
        <div className="profile-card-head">
          <h2 id="send-heading">Send to {displayName}</h2>
        </div>
        {payable.length ? (
          <ul className="address-list">
            {payable.map((record) => (
              <li key={record.key}>
                <span>{recordLabel(record.key)}</span>
                <AddressChip value={record.value} label={recordLabel(record.key)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="profile-empty">
            No addresses yet. Its owner can add them under <Button type="button" onClick={onManageRecords}>Records</Button>.
          </p>
        )}
        {paysPreviousOwner ? (
          <p className="primary-line warning">
            <strong>This name pays another wallet.</strong> Payments go to {abbreviate(paysPreviousOwner)}, not the wallet you're using.{' '}
            <Button variant="quiet" type="button" onClick={onManageRecords}>Update it under Records</Button>
          </p>
        ) : null}
        <p className={`primary-line ${primaryVerification.tone}`}>
          <strong>{primaryVerification.title}.</strong> {primaryVerification.description}
        </p>
      </Panel>

      <div className="profile-side">
        {other.length ? (
          <Panel className="profile-card" aria-labelledby="links-heading">
            <h2 id="links-heading">Links and records</h2>
            <ul className="link-list">
              {other.map((record) => {
                const href = record.key.startsWith('text.') ? null : safeLink(record.value)
                return (
                  <li key={record.key}>
                    <span>{recordLabel(record.key)}</span>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer nofollow">
                        {record.value.replace(/^https:\/\//i, '').replace(/\/$/, '')} <ArrowUpRight size={14} />
                      </a>
                    ) : isIdentifierRecord(record.key) ? (
                      <code>{record.value}</code>
                    ) : (
                      <p>{record.value}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panel>
        ) : null}

        <Panel className="profile-card" aria-labelledby="subnames-heading">
          <div className="profile-card-head">
            <h2 id="subnames-heading">Subnames</h2>
            <Button variant="quiet" type="button" onClick={onSubdomains}>Manage</Button>
          </div>
          {subnames.length ? (
            <ul className="chip-list">
              {subnames.slice(0, 8).map((subname) => <li key={subname.node}><NameChip name={subname.name} /></li>)}
            </ul>
          ) : (
            <EmptyState>No subnames. Add one under Subnames.</EmptyState>
          )}
        </Panel>

        <Panel className="profile-card" aria-labelledby="recent-heading">
          <div className="profile-card-head">
            <h2 id="recent-heading">Recent</h2>
            <Button variant="quiet" type="button" onClick={onActivity}>All activity</Button>
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
            <EmptyState>No activity recorded.</EmptyState>
          )}
        </Panel>
      </div>
    </div>
  )
}
