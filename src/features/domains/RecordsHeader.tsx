import { PanelHeader } from '../../components/ui/PanelHeader'

export function RecordsHeader({
  displayName,
}: {
  displayName: string
}) {
  return (
    <PanelHeader
      badge="Public records"
      headingId="records-heading"
      subtitle={displayName}
      title="Records"
    />
  )
}
