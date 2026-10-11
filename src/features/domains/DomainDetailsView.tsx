import { activityActions } from '../activity/activityActions'
import { Fragment, type ReactNode } from 'react'
import { Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { ArrowUpRight } from 'lucide-react'
import { AddressChip } from '../../components/ui/AddressChip'
import { NameChip } from '../../components/ui/NameChip'
import { EmptyState } from '../../components/ui/EmptyState'
import { abbreviate } from '../../utils/format'
import {
  type ActivityEntry,
  type NameIntegration,
  type NameSupport,
  type ResolverRecord,
  type SubnameState,
} from '../../names/internal'
import { ActivityTime } from '../activity/ActivityHistoryView'
import type { PrimaryVerificationSummary } from './details/primaryVerification'
import { isIdentifierRecord, recordLabel } from './recordPresentation'
import { isSubname } from './domainFormat'
import { nameControlCopy } from '../trust/trustCopy'

// Records a sender needs, in the order a wallet would look for them.
const payableKeys = ['moonlight_address', 'phoenix_payment_endpoint', 'evm_address',
  'address.btc', 'address.eth', 'address.sol', 'address.evm', 'dusk_contract', 'dusk_asset']
const hiddenKeys = new Set([...payableKeys, 'text.description', 'avatar'])

function safeLink(value: string) {
  return /^https:\/\//i.test(value) ? value : null
}

const listed = (names: string[]) => names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? ''

// Apps named with their links, in a sentence: "A, B and C".
function Integrations({ apps }: { apps: NameIntegration[] }) {
  return <>{apps.map((app, index) => <Fragment key={app.name}>
    {index ? index === apps.length - 1 ? ' and ' : ', ' : null}
    {app.url ? <a href={app.url} target="_blank" rel="noreferrer">{app.name}</a> : app.name}
  </Fragment>)}</>
}

// Where a .dusk name works today, for its owner. Wallets and explorers are listed only once the
// deployment's configuration says they support names; until then no wallet support is claimed.
function NameSupportNote({ displayName, hasAddress, support }: { displayName: string; hasAddress: boolean; support: NameSupport }) {
  return <Panel className="profile-card" aria-labelledby="pay-heading">
    <h2 id="pay-heading">How people pay you</h2>
    <ul className="name-support">
      <li>{!support.wallets.length ? 'Wallets can\'t send to .dusk names yet. Share your Dusk address instead.'
        : hasAddress ? <>People can send to {displayName} in <Integrations apps={support.wallets} />. Other wallets need your Dusk address.</>
          : <>Once you add your Dusk address, people can send to {displayName} in <Integrations apps={support.wallets} />.</>}</li>
      <li>{hasAddress ? `Anyone can look up ${displayName} on this site and copy its Dusk address.`
        : `Add your Dusk address under Records, so anyone can look up ${displayName} on this site and copy it.`}</li>
      {support.explorers.length ? <li><Integrations apps={support.explorers} /> {support.explorers.length === 1 ? 'shows' : 'show'} .dusk names.</li> : null}
      <li>Apps can resolve it with the Dusk Domains API and SDK.</li>
    </ul>
  </Panel>
}

// A registered name's public profile: where to send, what it links to, and what changed lately.
export function DomainDetailsView({ canEdit = false, isOwner = false, separateManager = false, primaryControl, nameSupport = { wallets: [], explorers: [] }, displayName, onManageRecords, onSubdomains, parentResolverRecords, paysPreviousOwner, primaryVerification, subnames, viewerAuthority, activity }: {
  canEdit?: boolean
  /** The connected wallet owns this name. */
  isOwner?: boolean
  /** Another wallet is its manager, which can change its records and subnames. */
  separateManager?: boolean
  primaryControl?: ReactNode
  /** Apps that support .dusk names, from the deployment's configuration. */
  nameSupport?: NameSupport
  displayName: string
  onManageRecords: () => void
  onSubdomains: () => void
  parentResolverRecords: ResolverRecord[]
  paysPreviousOwner: string | null
  primaryVerification: PrimaryVerificationSummary
  subnames: SubnameState[]
  viewerAuthority: string
  activity: {
    activityEntries: ActivityEntry[]
    /** Older activity is still to load. */
    hasMore?: boolean
    currentBlockHeight: number | null
    nowSeconds?: number
    marketplaceContractId?: string | null
    /** The name's current owner and manager. */
    holders?: { owner: string, manager: string } | null
    /** Its subnames' own activity, which says what a subname change on this name was. */
    subnameActivity?: import('../activity/subnameActivity').SubnameActivity
    /** Dusk addresses known on this page, to show accounts by address. */
    addresses?: string[]
    formatActivityTime: (timestamp: string) => string
    onActivity: () => void
  }
}) {
  const {
    activityEntries,
    hasMore,
    currentBlockHeight,
    nowSeconds,
    marketplaceContractId,
    holders,
    subnameActivity,
    addresses = [],
    formatActivityTime,
    onActivity,
  } = activity
  const recent = activityActions(activityEntries, {
    viewerAuthority, currentBlockHeight, nowSeconds, marketplaceContractId, subnames, holders, subnameActivity, partial: hasMore,
    addresses: [...new Set([...parentResolverRecords.filter(record => record.key === 'moonlight_address').map(record => record.value), ...addresses])],
  }).slice(0, 4)
  const payable = payableKeys
    .map((key) => parentResolverRecords.find((record) => record.key === key))
    .filter((record): record is ResolverRecord => Boolean(record))
  // A wallet that sends to a name sends to its Dusk address; another chain's address is only to copy.
  const hasDuskAddress = payable.some(record => record.key === 'moonlight_address')
  const other = parentResolverRecords.filter((record) => !hiddenKeys.has(record.key))

  return (
    <div className="profile-grid">
      <Panel className="profile-card" aria-labelledby="send-heading">
        <div className="profile-card-head">
          <h2 id="send-heading">Send to {displayName}</h2>
        </div>
        {payable.length ? <p className="profile-note">{nameSupport.wallets.length && hasDuskAddress
          ? `To pay ${displayName}, send to it in ${listed(nameSupport.wallets.map(app => app.name))}, or copy an address below into another wallet.`
          : `To pay ${displayName}, copy an address below into a wallet.`}</p> : null}
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
            No addresses yet. {canEdit ? <Button type="button" onClick={onManageRecords}>Add an address</Button> : null}
          </p>
        )}
        {paysPreviousOwner ? (
          <p className="primary-line warning">
            <strong>This name pays another wallet.</strong> Payments go to {abbreviate(paysPreviousOwner)}, not the wallet you're using.{' '}
            <Button variant="quiet" type="button" onClick={onManageRecords}>Update it under Records</Button>
          </p>
        ) : null}
        {primaryControl ?? <p className="primary-line">{primaryVerification.tone === 'success' ? `Apps show ${displayName} for this Dusk address.` : 'This name is not the primary name for its Dusk address.'}</p>}
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

        {canEdit || subnames.length ? <Panel className="profile-card" aria-labelledby="subnames-heading">
          <div className="profile-card-head">
            <h2 id="subnames-heading">Subnames</h2>
            <Button variant="quiet" type="button" onClick={onSubdomains}>{canEdit ? 'Manage' : 'View'}</Button>
          </div>
          {subnames.length ? (
            <ul className="chip-list">
              {subnames.slice(0, 8).map((subname) => <li key={subname.node}><NameChip name={subname.name} /></li>)}
            </ul>
          ) : (
            <EmptyState>{canEdit ? 'No subnames. Add one under Subnames.' : 'No subnames.'}</EmptyState>
          )}
        </Panel> : null}

        {canEdit ? <NameSupportNote displayName={displayName} hasAddress={hasDuskAddress} support={nameSupport} /> : null}

        {isOwner && !isSubname(displayName) ? <Panel className="profile-card" aria-labelledby="control-heading">
          <h2 id="control-heading">Who controls it</h2>
          <p className="profile-note">{nameControlCopy(displayName, separateManager)}</p>
        </Panel> : null}

        <Panel className="profile-card" aria-labelledby="recent-heading">
          <div className="profile-card-head">
            <h2 id="recent-heading">Recent</h2>
            <Button variant="quiet" type="button" onClick={onActivity}>All activity</Button>
          </div>
          {recent.length ? (
            <ul className="recent-list">
              {recent.map(action => (
                <li key={action.key}>
                  <span>{action.title}{action.details.length ? <em>{action.details.join(' · ')}</em> : null}</span>
                  <ActivityTime compact action={action} currentBlockHeight={currentBlockHeight} formatActivityTime={formatActivityTime} />
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
