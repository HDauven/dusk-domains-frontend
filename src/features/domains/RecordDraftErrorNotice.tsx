import { AlertTriangle } from 'lucide-react'

export function RecordDraftErrorNotice({
  errors,
}: {
  errors: string[]
}) {
  if (errors.length === 0) return null

  return (
    <div className="public-warning record">
      <AlertTriangle size={17} />
      <span>{errors[0]}</span>
    </div>
  )
}
