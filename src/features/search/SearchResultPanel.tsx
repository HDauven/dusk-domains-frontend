import type { ComponentProps } from 'react'
import { ActivityHistoryView } from '../activity/ActivityHistoryView'
import { DomainDetailsView } from '../domains/DomainDetailsView'
import { DomainSettingsView } from '../domains/DomainSettingsView'
import { PrimaryDomainView } from '../domains/PrimaryDomainView'
import { RecordsView } from '../domains/RecordsView'
import { SubdomainsView } from '../domains/SubdomainsView'
import { RegistrationFlowPanel } from '../registration/RegistrationFlowPanel'
import { AvailabilityBanner } from './AvailabilityBanner'
import { SearchResultOverview } from './SearchResultOverview'

export type SearchResultView = 'overview' | 'register' | 'details' | 'manage' | 'records' | 'primary' | 'subnames' | 'activity'

export type SearchResultPanelProps = {
  activityProps: ComponentProps<typeof ActivityHistoryView>
  availabilityProps: ComponentProps<typeof AvailabilityBanner>
  detailsProps: ComponentProps<typeof DomainDetailsView>
  nodeHex: string
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
  availabilityProps,
  detailsProps,
  nodeHex,
  overviewProps,
  primaryProps,
  recordsProps,
  registrationProps,
  resultView,
  settingsProps,
  subdomainsProps,
}: SearchResultPanelProps) {
  return (
    <section className="result-area" aria-label="Domain registration">
      <AvailabilityBanner {...availabilityProps} />

      {resultView === 'overview' ? (
        <SearchResultOverview {...overviewProps} />
      ) : null}

      {resultView === 'details' ? (
        <DomainDetailsView {...detailsProps} />
      ) : null}

      {resultView === 'register' ? (
        <RegistrationFlowPanel {...registrationProps} />
      ) : null}

      {nodeHex && resultView === 'manage' ? (
        <DomainSettingsView {...settingsProps} />
      ) : null}

      {nodeHex && resultView === 'subnames' ? (
        <SubdomainsView {...subdomainsProps} />
      ) : null}

      {nodeHex && resultView === 'records' ? (
        <RecordsView {...recordsProps} />
      ) : null}

      {nodeHex && resultView === 'primary' ? (
        <PrimaryDomainView {...primaryProps} />
      ) : null}

      {resultView === 'activity' ? (
        <ActivityHistoryView {...activityProps} />
      ) : null}
    </section>
  )
}
