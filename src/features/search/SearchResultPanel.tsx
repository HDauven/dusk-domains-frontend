import { Tabs, TabPanel } from '../../components/ui/Tabs'
import type { ComponentProps } from 'react'
import { ActivityHistoryView } from '../activity/ActivityHistoryView'
import { DomainDetailsView } from '../domains/DomainDetailsView'
import { DomainSettingsView } from '../domains/DomainSettingsView'
import { PrimaryDomainView } from '../domains/PrimaryDomainView'
import { RecordsView } from '../domains/RecordsView'
import { SubdomainsView } from '../domains/SubdomainsView'
import { RegistrationFlowPanel } from '../registration/RegistrationFlowPanel'
import { NameHeader } from './NameHeader'
import { SearchResultOverview } from './SearchResultOverview'

export type SearchResultView = 'overview' | 'register' | 'details' | 'manage' | 'records' | 'primary' | 'subnames' | 'activity'

const nameTabs: Array<{ view: SearchResultView, label: string }> = [
  { view: 'details', label: 'Profile' },
  { view: 'records', label: 'Records' },
  { view: 'subnames', label: 'Subnames' },
  { view: 'primary', label: 'Primary name' },
  { view: 'manage', label: 'Settings' },
  { view: 'activity', label: 'Activity' },
]

export type SearchResultPanelProps = {
  activityProps: ComponentProps<typeof ActivityHistoryView>
  detailsProps: ComponentProps<typeof DomainDetailsView>
  headerProps: ComponentProps<typeof NameHeader>
  nodeHex: string
  onResultViewChange: (view: SearchResultView) => void
  overviewProps: ComponentProps<typeof SearchResultOverview>
  primaryProps: ComponentProps<typeof PrimaryDomainView>
  recordsProps: ComponentProps<typeof RecordsView>
  registrationProps: ComponentProps<typeof RegistrationFlowPanel>
  resultView: SearchResultView
  settingsProps: ComponentProps<typeof DomainSettingsView>
  subdomainsProps: ComponentProps<typeof SubdomainsView>
}

export function SearchResultPanel({
  activityProps,
  detailsProps,
  headerProps,
  nodeHex,
  onResultViewChange,
  overviewProps,
  primaryProps,
  recordsProps,
  registrationProps,
  resultView,
  settingsProps,
  subdomainsProps,
}: SearchResultPanelProps) {
  const registered = headerProps.status === 'registered'
  const tabbed = registered && nodeHex && resultView !== 'overview' && resultView !== 'register'

  const content = (
    <>
      {resultView === 'details' ? <DomainDetailsView {...detailsProps} /> : null}
      {nodeHex && resultView === 'manage' ? <DomainSettingsView {...settingsProps} /> : null}
      {nodeHex && resultView === 'subnames' ? <SubdomainsView {...subdomainsProps} /> : null}
      {nodeHex && resultView === 'records' ? <RecordsView {...recordsProps} /> : null}
      {nodeHex && resultView === 'primary' ? <PrimaryDomainView {...primaryProps} /> : null}
      {resultView === 'activity' ? <ActivityHistoryView {...activityProps} /> : null}
      {resultView === 'register' ? <RegistrationFlowPanel {...registrationProps} /> : null}
    </>
  )

  return (
    <section className="result-area" aria-label={`${headerProps.displayName} name page`}>
      <NameHeader {...headerProps} />

      {tabbed ? (
        <Tabs id="name-sections" label="Name sections" items={nameTabs.map(({ view, label }) => ({ id: view, label }))} value={resultView} onChange={onResultViewChange} />
      ) : null}

      {resultView === 'overview' ? <SearchResultOverview {...overviewProps} /> : null}
      {tabbed ? <TabPanel id="name-sections" value={resultView}>{content}</TabPanel> : content}
    </section>
  )
}
