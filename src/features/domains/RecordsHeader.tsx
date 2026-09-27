import { PanelHeader } from '../../components/ui/PanelHeader'

export function RecordsHeader({
  displayName,
}: {
  displayName: string
}) {
  return (
    <PanelHeader
      headingId="records-heading"
      subtitle={`Where ${displayName} points: addresses, links and profile. Everything here is public.`}
      title="Records"
    />
  )
}
