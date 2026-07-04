import { Clock } from 'lucide-react'

export function ReservationRecoveryNotice({
  onView,
}: {
  onView: () => void
}) {
  return (
    <div className="reservation-recovery">
      <Clock size={17} />
      <span>This reservation is saved in My Domains.</span>
      <button className="commit-button save-record" type="button" onClick={onView}>
        View
      </button>
    </div>
  )
}
