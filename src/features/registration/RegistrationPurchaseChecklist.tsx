import { CheckCircle2, Clock } from 'lucide-react'
import type { CommitWindow } from './flow/types'
import { pendingReservationNextStepCopy } from './registrationCopy'

export function RegistrationPurchaseChecklist({
  commitWindow,
}: {
  commitWindow: CommitWindow
}) {
  return (
    <div className="includes review-includes">
      <h3>Purchase</h3>
      <span><CheckCircle2 size={16} /> Reservation signed</span>
      <span><Clock size={16} /> {commitWindow.status === 'ready' ? 'Ready to complete' : pendingReservationNextStepCopy(commitWindow.status, commitWindow.waitBlocks)}</span>
      <span><CheckCircle2 size={16} /> Fee paid on completion</span>
    </div>
  )
}
