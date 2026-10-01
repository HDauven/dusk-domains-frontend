import { Button } from '../../components/ui/Button'
import { Clock } from 'lucide-react'

export function ReservationRecoveryNotice({
  onView,
}: {
  onView: () => void
}) {
  return (
    <p className="reservation-recovery">
      <Clock size={15} />
      <span>If you leave, this reservation waits for you under My names.</span>
      <Button variant="quiet" type="button" onClick={onView}>
        View
      </Button>
    </p>
  )
}
