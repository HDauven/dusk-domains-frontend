import { getRecordDefinition, type ResolverRecord, type SubnameState } from '../../../names/internal'
import { abbreviate } from '../../../utils/format'

export type PrimaryVerificationSummary = {
  description: string
  displayValue: string
  title: string
  tone: string
}

export function DomainPrimaryStatusCard({
  primaryVerification,
}: {
  primaryVerification: PrimaryVerificationSummary
}) {
  return (
    <div className={`primary-status ${primaryVerification.tone}`}>
      <strong>{primaryVerification.title}</strong>
      <span>{primaryVerification.description}</span>
      <code>{abbreviate(primaryVerification.displayValue)}</code>
    </div>
  )
}

export function DomainRecordsPreview({
  records,
}: {
  records: ResolverRecord[]
}) {
  return (
    <div className="details-records">
      <strong>Records</strong>
      {records.length ? (
        records.slice(0, 4).map((record) => (
          <p key={record.key}>
            <span>{getRecordDefinition(record.key)?.label ?? record.key}</span>
            <code>{abbreviate(record.value)}</code>
          </p>
        ))
      ) : (
        <p><span>None found</span></p>
      )}
    </div>
  )
}

export function DomainSubdomainsPreview({
  subnames,
}: {
  subnames: SubnameState[]
}) {
  return (
    <div className="details-records details-subnames">
      <strong>Subdomains</strong>
      {subnames.length ? (
        subnames.slice(0, 4).map((subname) => (
          <p key={subname.node}>
            <span>{subname.name}</span>
            <code>{subname.status}</code>
          </p>
        ))
      ) : (
        <p><span>None found</span></p>
      )}
    </div>
  )
}
