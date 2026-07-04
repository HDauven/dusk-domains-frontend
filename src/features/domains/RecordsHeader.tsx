import { PanelHeader } from '../../components/ui/PanelHeader'

export function RecordsHeader({
  displayName,
  onBack,
}: {
  displayName: string
  onBack: () => void
}) {
  return (
    <PanelHeader
      backLabel="Back to details"
      badge="Public records"
      headingId="records-heading"
      onBack={onBack}
      subtitle={displayName}
      title="Records"
    />
  )
}
