import { reportNameUrl } from './reportNameUrl'
import { SubnameAuthorityControls } from '../domains/subdomains/SubnameAuthorityControls'
import { ManagementFeedback } from '../domains/ManagementFeedback'
import { canControlThroughAncestor } from '../../app/derived/managementCapabilities'
import { sameAuthority } from '../identity/ownerLabel'
import { Tabs, TabPanel } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import type { ComponentProps } from 'react'
import { ActivityHistoryView } from '../activity/ActivityHistoryView'
import { DomainDetailsView } from '../domains/DomainDetailsView'
import { isSubname } from '../domains/domainFormat'
import { DomainSettingsView } from '../domains/DomainSettingsView'
import { PrimaryNameControl } from '../domains/PrimaryNameControl'
import { RecordsView } from '../domains/RecordsView'
import { SubdomainsView } from '../domains/SubdomainsView'
import { RegistrationFlowPanel } from '../registration/RegistrationFlowPanel'
import { NameHeader } from './NameHeader'
import { SearchResultOverview } from './SearchResultOverview'
import { namePageAccess, nameSections } from './namePageAccess'
import { useNamePageMetadata } from './namePageMetadata'
import { NameShare } from './NameShare'
import { NightCard } from './NightCard'
import { subnameControlCopy } from '../trust/trustCopy'

export type SearchResultView = 'overview' | 'register' | 'details' | 'manage' | 'records' | 'subnames' | 'activity'

export type SearchResultPanelProps = {
  abuseUrl?: string | null
  referralAddress?: string
  activityProps: ComponentProps<typeof ActivityHistoryView>
  detailsProps: ComponentProps<typeof DomainDetailsView>
  headerProps: ComponentProps<typeof NameHeader>
  nodeHex: string
  onOpenName?: (name: string) => void
  onResultViewChange: (view: SearchResultView) => void
  overviewProps: ComponentProps<typeof SearchResultOverview>
  registrationProps: ComponentProps<typeof RegistrationFlowPanel>
  resultView: SearchResultView
  management: {
    primaryProps: ComponentProps<typeof PrimaryNameControl>
    recordsProps: ComponentProps<typeof RecordsView>
    settingsProps: ComponentProps<typeof DomainSettingsView>
    subdomainsProps: ComponentProps<typeof SubdomainsView>
  }
}

export function SearchResultPanel({ abuseUrl, activityProps, detailsProps, headerProps, nodeHex, onOpenName, onResultViewChange, overviewProps, referralAddress, registrationProps, resultView, management }: SearchResultPanelProps) {
  const {
    primaryProps,
    recordsProps,
    settingsProps,
    subdomainsProps,
  } = management
  useNamePageMetadata(headerProps.displayName, headerProps.records)
  const managedName = nodeHex && settingsProps?.managedName.node === nodeHex ? settingsProps.managedName : null
  const { isOwner, canEdit } = namePageAccess(managedName?.owner ?? '', managedName?.manager ?? '', headerProps.viewerAuthority ?? '')
  const ancestorControl = canControlThroughAncestor(managedName, headerProps.viewerAuthority ?? '', settingsProps?.clock.currentBlockHeight ?? null)
  const parent = managedName?.ancestors?.[0]
  const namespaceTarget = managedName && parent ? { node: managedName.node, name: headerProps.displayName, parentNode: parent.node } : null
  // Whoever holds a name above a subname can take it back, so every subname page says so, to its holders and to visitors.
  const labels = headerProps.displayName.replace(/\.dusk$/, '').split('.')
  const subnameControl = headerProps.status === 'registered' && managedName && isSubname(headerProps.displayName) ? subnameControlCopy({
    parent: parent?.name ?? `${labels.slice(1).join('.')}.dusk`,
    deeper: Math.max(managedName.ancestors?.length ?? 0, labels.length - 1) > 1,
    holder: !ancestorControl && [managedName.owner, managedName.manager].some(authority => sameAuthority(authority, headerProps.viewerAuthority)),
    expiresWithParent: managedName.expiryPolicy === 'inherits_parent',
  }) : null
  // Anyone can pay to renew a name a contract holds, such as a listed one.
  const canPayRenewal = Boolean(managedName?.ownerIsContract && headerProps.viewerAuthority && !isSubname(headerProps.displayName))
  const tabs = nameSections(canEdit, Boolean(subdomainsProps?.subnames.length), canPayRenewal)
  const tabbed = headerProps.status === 'registered' && nodeHex && resultView !== 'overview' && resultView !== 'register'
  // A wallet can disconnect while an owner tab is selected. Never retain those controls.
  const view = tabbed && !tabs.some(tab => tab.id === resultView) ? 'details' : resultView
  const reportUrl = headerProps.status === 'registered' ? reportNameUrl(abuseUrl, headerProps.displayName) : null
  // Staged record changes stay with the name while other sections are open. Values that can't be saved yet count too.
  const unsavedRecords = canEdit && view !== 'records'
    ? (recordsProps?.draft?.recordDraftMutations?.length ?? 0) + (recordsProps?.draft?.recordDraftInvalid?.length ?? 0) : 0
  const primaryControl = primaryProps?.primaryVerification
    ? <PrimaryNameControl {...primaryProps} onOpenRecords={canEdit ? () => onResultViewChange('records') : undefined} /> : undefined
  const hasPrimaryCleanup = primaryProps?.canClearPrimary || Boolean(primaryProps?.primaryVerification?.cleanupDescription)
  const content = <>
    {view === 'details' ? <DomainDetailsView {...detailsProps} canEdit={canEdit} isOwner={isOwner}
      separateManager={Boolean(managedName && !sameAuthority(managedName.manager, managedName.owner))}
      primaryControl={canEdit || hasPrimaryCleanup ? primaryControl : undefined} /> : null}
    {nodeHex && view === 'manage' && (canEdit || canPayRenewal) ? <>
      <DomainSettingsView {...settingsProps} isOwner={isOwner} />
      {canEdit ? primaryControl : null}
    </> : null}
    {nodeHex && view === 'subnames' ? <SubdomainsView {...subdomainsProps}
      onRecordTargetSelect={subname => onOpenName?.(subname.name)}
      authority={{ ...subdomainsProps.authority, ownerAddresses: headerProps.ownerAddresses, canEdit }} /> : null}
    {nodeHex && view === 'records' && canEdit ? <RecordsView {...recordsProps} /> : null}
    {view === 'activity' ? <ActivityHistoryView {...activityProps} /> : null}
    {view === 'register' ? <RegistrationFlowPanel {...registrationProps} /> : null}
  </>
  if (headerProps.status === 'registered' && !managedName) return <section className="result-area" aria-label={`${headerProps.displayName} name page`}>
    <h1>{headerProps.displayName}</h1>
    <p role="status">Loading owner, expiry and records…</p>
    <NightCard name={headerProps.displayName} />
    <NameShare key={headerProps.displayName} name={headerProps.displayName} referralAddress={referralAddress} />
  </section>
  return <section className="result-area" aria-label={`${headerProps.displayName} name page`}>
    {view !== 'register' && !(view === 'overview' && overviewProps.canRegister) ? <NameHeader {...headerProps} owner={managedName?.owner ?? null} manager={managedName?.manager ?? null} /> : null}
    {subnameControl ? <p className="field-note subname-control">{subnameControl}</p> : null}
    {headerProps.status !== 'invalid' ? <>
      <NightCard name={headerProps.displayName} />
      <NameShare key={headerProps.displayName} name={headerProps.displayName} referralAddress={referralAddress} />
    </> : null}
    {ancestorControl && namespaceTarget ? <>
      <SubnameAuthorityControls key={namespaceTarget.node} name={namespaceTarget.name}
        onReassign={(owner, manager) => subdomainsProps.authority.onReassignSubname?.(namespaceTarget, owner, manager) ?? Promise.resolve()}
        onTakeBack={() => subdomainsProps.authority.onTakeBackSubname?.(namespaceTarget) ?? Promise.resolve()}
        onRemove={() => subdomainsProps.authority.onRemoveSubname?.(namespaceTarget) ?? Promise.resolve()} />
      <ManagementFeedback error={subdomainsProps.error} txState={subdomainsProps.txState} onDismiss={subdomainsProps.onDismissFeedback} />
    </> : null}
    {tabbed ? <>
      <div className="name-section-select"><label htmlFor="name-section">Section</label><select id="name-section" value={view} onChange={event => onResultViewChange(event.target.value as SearchResultView)}>{tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}</select></div>
      <Tabs className="name-section-tabs" id="name-sections" label="Name sections" items={tabs} value={view} onChange={onResultViewChange} />
      {unsavedRecords ? <p className="field-note record-unsaved" role="status">
        {unsavedRecords === 1 ? '1 record change is' : `${unsavedRecords} record changes are`} not saved yet. <Button variant="quiet" onClick={() => onResultViewChange('records')}>Review</Button>
      </p> : null}
    </> : null}
    {view === 'overview' ? <>
      <SearchResultOverview {...overviewProps} />
      {hasPrimaryCleanup ? primaryControl : null}
    </> : null}
    {tabbed ? <TabPanel id="name-sections" value={view}>{content}</TabPanel> : content}
    {reportUrl ? <a className="name-report field-note" href={reportUrl} target="_blank" rel="noreferrer">Report this name</a> : null}
  </section>
}
