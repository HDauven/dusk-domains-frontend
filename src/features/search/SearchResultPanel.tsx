import { Tabs, TabPanel } from '../../components/ui/Tabs'
import type { ComponentProps } from 'react'
import { ActivityHistoryView } from '../activity/ActivityHistoryView'
import { DomainDetailsView } from '../domains/DomainDetailsView'
import { DomainSettingsView } from '../domains/DomainSettingsView'
import { PrimaryNameControl } from '../domains/PrimaryNameControl'
import { RecordsView } from '../domains/RecordsView'
import { SubdomainsView } from '../domains/SubdomainsView'
import { RegistrationFlowPanel } from '../registration/RegistrationFlowPanel'
import { NameHeader } from './NameHeader'
import { SearchResultOverview } from './SearchResultOverview'
import { namePageAccess, nameSections } from './namePageAccess'

export type SearchResultView = 'overview' | 'register' | 'details' | 'manage' | 'records' | 'subnames' | 'activity'

export type SearchResultPanelProps = {
  activityProps: ComponentProps<typeof ActivityHistoryView>
  detailsProps: ComponentProps<typeof DomainDetailsView>
  headerProps: ComponentProps<typeof NameHeader>
  nodeHex: string
  onOpenName?: (name: string) => void
  onResultViewChange: (view: SearchResultView) => void
  overviewProps: ComponentProps<typeof SearchResultOverview>
  primaryProps: ComponentProps<typeof PrimaryNameControl>
  recordsProps: ComponentProps<typeof RecordsView>
  registrationProps: ComponentProps<typeof RegistrationFlowPanel>
  resultView: SearchResultView
  settingsProps: ComponentProps<typeof DomainSettingsView>
  subdomainsProps: ComponentProps<typeof SubdomainsView>
}

export function SearchResultPanel({ activityProps, detailsProps, headerProps, nodeHex, onOpenName, onResultViewChange, overviewProps, primaryProps, recordsProps, registrationProps, resultView, settingsProps, subdomainsProps }: SearchResultPanelProps) {
  const managedName = nodeHex && settingsProps?.managedName.node === nodeHex ? settingsProps.managedName : null
  const { isOwner, canEdit } = namePageAccess(managedName?.owner ?? '', managedName?.manager ?? '', headerProps.viewerAuthority ?? '')
  const tabs = nameSections(canEdit, subdomainsProps.subnames.length > 0)
  const tabbed = headerProps.status === 'registered' && nodeHex && resultView !== 'overview' && resultView !== 'register'
  // A wallet can disconnect while an owner tab is selected. Never retain those controls.
  const view = tabbed && !tabs.some(tab => tab.id === resultView) ? 'details' : resultView
  const content = <>
    {view === 'details' ? <DomainDetailsView {...detailsProps} canEdit={canEdit} primaryControl={canEdit ? <PrimaryNameControl {...primaryProps} /> : undefined} /> : null}
    {nodeHex && view === 'manage' && canEdit ? <DomainSettingsView {...settingsProps} isOwner={isOwner} /> : null}
    {nodeHex && view === 'subnames' ? <SubdomainsView {...subdomainsProps} canEdit={canEdit} onRecordTargetSelect={subname => onOpenName?.(subname.name)} /> : null}
    {nodeHex && view === 'records' && canEdit ? <RecordsView {...recordsProps} /> : null}
    {view === 'activity' ? <ActivityHistoryView {...activityProps} /> : null}
    {view === 'register' ? <RegistrationFlowPanel {...registrationProps} /> : null}
  </>
  return <section className="result-area" aria-label={`${headerProps.displayName} name page`}>
    {view !== 'register' && !(view === 'overview' && overviewProps.canRegister) ? <NameHeader {...headerProps} owner={managedName?.owner ?? null} /> : null}
    {tabbed ? <>
      <label className="name-section-select">Section<select value={view} onChange={event => onResultViewChange(event.target.value as SearchResultView)}>{tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}</select></label>
      <Tabs className="name-section-tabs" id="name-sections" label="Name sections" items={tabs} value={view} onChange={onResultViewChange} />
    </> : null}
    {view === 'overview' ? <SearchResultOverview {...overviewProps} /> : null}
    {tabbed ? <TabPanel id="name-sections" value={view}>{content}</TabPanel> : content}
  </section>
}
