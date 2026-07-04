import { PanelHeader } from '../../components/ui/PanelHeader'
import type { RecentChangeWarning, ResolverRecord, SubnameState } from '../../names/internal'
import { RecentWarningSummary } from '../activity/RecentWarnings'
import { DomainDetailsActions } from './details/DomainDetailsActions'
import {
  DomainPrimaryStatusCard,
  DomainRecordsPreview,
  DomainSubdomainsPreview,
  type PrimaryVerificationSummary,
} from './details/DomainDetailsCards'

export function DomainDetailsView({
  displayName,
  onActivity,
  onBack,
  onManageRecords,
  onPrimary,
  onSettings,
  onSubdomains,
  parentResolverRecords,
  primaryVerification,
  recentWarnings,
  subnames,
}: {
  displayName: string
  onActivity: () => void
  onBack: () => void
  onManageRecords: () => void
  onPrimary: () => void
  onSettings: () => void
  onSubdomains: () => void
  parentResolverRecords: ResolverRecord[]
  primaryVerification: PrimaryVerificationSummary
  recentWarnings: RecentChangeWarning[]
  subnames: SubnameState[]
}) {
  return (
    <section className="overview-panel details-panel" aria-labelledby="details-heading">
      <PanelHeader
        backLabel="Back to result"
        headingId="details-heading"
        onBack={onBack}
        subtitle={displayName}
        title="Domain details"
      />

      <div className="details-grid">
        <DomainPrimaryStatusCard primaryVerification={primaryVerification} />
        <DomainRecordsPreview records={parentResolverRecords} />
        <DomainSubdomainsPreview subnames={subnames} />
      </div>

      <DomainDetailsActions
        onActivity={onActivity}
        onManageRecords={onManageRecords}
        onPrimary={onPrimary}
        onSettings={onSettings}
        onSubdomains={onSubdomains}
      />

      <RecentWarningSummary warnings={recentWarnings} onReview={onActivity} />
    </section>
  )
}
