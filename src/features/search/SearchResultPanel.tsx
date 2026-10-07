import { SubnameAuthorityControls } from '../domains/subdomains/SubnameAuthorityControls'
import { ManagementFeedback } from '../domains/ManagementFeedback'
import { canControlThroughAncestor } from '../../app/derived/managementCapabilities'
import { sameAuthority } from '../identity/ownerLabel'
import { Tabs, TabPanel } from '../../components/ui/Tabs'
import { canRenewOutsideEscrow } from '../../app/managedNameState'
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

export type SearchResultView = 'overview' | 'register' | 'details' | 'manage' | 'records' | 'subnames' | 'activity'

export type SearchResultPanelProps = {
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

export function SearchResultPanel({ activityProps, detailsProps, headerProps, nodeHex, onOpenName, onResultViewChange, overviewProps, referralAddress, registrationProps, resultView, management }: SearchResultPanelProps) {
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
  const canPayRenewal = Boolean(managedName?.ownerIsContract && canRenewOutsideEscrow(managedName) && headerProps.viewerAuthority && !isSubname(headerProps.displayName))
  const tabs = nameSections(canEdit, Boolean(subdomainsProps?.subnames.length), canPayRenewal)
  const tabbed = headerProps.status === 'registered' && nodeHex && resultView !== 'overview' && resultView !== 'register'
  // A wallet can disconnect while an owner tab is selected. Never retain those controls.
  const view = tabbed && !tabs.some(tab => tab.id === resultView) ? 'details' : resultView
  const content = <>
    {view === 'details' ? <DomainDetailsView {...detailsProps} canEdit={canEdit} primaryControl={canEdit || primaryProps?.canClearPrimary ? <PrimaryNameControl {...primaryProps} /> : undefined} /> : null}
    {nodeHex && view === 'manage' && (canEdit || canPayRenewal) ? <DomainSettingsView {...settingsProps} isOwner={isOwner} /> : null}
    {nodeHex && view === 'subnames' ? <SubdomainsView {...subdomainsProps}
      onRecordTargetSelect={subname => onOpenName?.(subname.name)}
      authority={{ ...subdomainsProps.authority, ownerAddresses: headerProps.ownerAddresses, canEdit }} /> : null}
    {nodeHex && view === 'records' && canEdit ? <RecordsView {...recordsProps} /> : null}
    {view === 'activity' ? <ActivityHistoryView {...activityProps} /> : null}
    {view === 'register' ? <RegistrationFlowPanel {...registrationProps} /> : null}
  </>
  return <section className="result-area" aria-label={`${headerProps.displayName} name page`}>
    {view !== 'register' && !(view === 'overview' && overviewProps.canRegister) ? <NameHeader {...headerProps} owner={managedName?.owner ?? null} /> : null}
    {headerProps.status !== 'invalid' ? <>
      <NightCard name={headerProps.displayName} />
      <NameShare key={headerProps.displayName} name={headerProps.displayName} referralAddress={referralAddress} />
    </> : null}
    {parent && !sameAuthority(parent.owner, managedName?.owner) ? <p className="field-note">The owner of {parent.name} can take this name back, and it expires with {parent.name}.</p> : null}
    {ancestorControl && namespaceTarget ? <>
      <SubnameAuthorityControls key={namespaceTarget.node} name={namespaceTarget.name}
        onReassign={(owner, manager) => subdomainsProps.authority.onReassignSubname?.(namespaceTarget, owner, manager) ?? Promise.resolve()}
        onTakeBack={() => subdomainsProps.authority.onTakeBackSubname?.(namespaceTarget) ?? Promise.resolve()}
        onRemove={() => subdomainsProps.authority.onRemoveSubname?.(namespaceTarget) ?? Promise.resolve()} />
      <ManagementFeedback error={subdomainsProps.error} txState={subdomainsProps.txState} />
    </> : null}
    {tabbed ? <>
      <div className="name-section-select"><label htmlFor="name-section">Section</label><select id="name-section" value={view} onChange={event => onResultViewChange(event.target.value as SearchResultView)}>{tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}</select></div>
      <Tabs className="name-section-tabs" id="name-sections" label="Name sections" items={tabs} value={view} onChange={onResultViewChange} />
    </> : null}
    {view === 'overview' ? <>
      <SearchResultOverview {...overviewProps} />
      {primaryProps?.canClearPrimary ? <PrimaryNameControl {...primaryProps} /> : null}
    </> : null}
    {tabbed ? <TabPanel id="name-sections" value={view}>{content}</TabPanel> : content}
  </section>
}
